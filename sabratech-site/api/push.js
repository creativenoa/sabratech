// Vercel serverless route: /api/push — phone (web push) alerts.
//
//   GET  /api/push                      → { publicKey }  (browser needs it to subscribe)
//   POST /api/push { action: 'flush' }  → sends every queued alert to members' phones
//   POST /api/push { action: 'test', endpoint } → sends a test to one device
//
// The signing keys (VAPID) are created on first use and kept in the private
// app_secrets table — no secret lives in code or in Vercel settings.
// Alerts are queued in `notifications` (pushed_at is null); a flush claims a
// batch atomically, so two flushes running at once never double-send.
// Needs DATABASE_URL (already set in Vercel).

import { neon } from '@neondatabase/serverless'
import webpush from 'web-push'

const SITE = 'https://sabratech.vercel.app'

async function vapid(sql) {
  let rows = await sql`select value from app_secrets where key = 'vapid'`
  if (!rows.length) {
    const keys = webpush.generateVAPIDKeys()
    await sql`insert into app_secrets (key, value) values ('vapid', ${JSON.stringify(keys)}::jsonb) on conflict (key) do nothing`
    rows = await sql`select value from app_secrets where key = 'vapid'`
  }
  const { publicKey, privateKey } = rows[0].value
  webpush.setVapidDetails(SITE, publicKey, privateKey)
  return publicKey
}

const toSub = s => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })

async function send(sql, sub, payload) {
  try {
    await webpush.sendNotification(toSub(sub), JSON.stringify(payload), { TTL: 60 * 60 * 24 })
    return true
  } catch (e) {
    // 404/410 = the phone unsubscribed or the app was removed: forget it.
    if (e?.statusCode === 404 || e?.statusCode === 410) await sql`delete from push_subscriptions where endpoint = ${sub.endpoint}`
    return false
  }
}

export default async function handler(req, res) {
  const { DATABASE_URL } = process.env
  if (!DATABASE_URL) return res.status(200).json({ ok: false, skipped: 'missing env' })
  const sql = neon(DATABASE_URL)

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ publicKey: await vapid(sql) })
    }
    if (req.method !== 'POST') return res.status(405).json({ ok: false })

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    await vapid(sql)

    if (body.action === 'test') {
      const rows = await sql`select * from push_subscriptions where endpoint = ${String(body.endpoint || '')}`
      if (!rows.length) return res.status(200).json({ ok: false, error: 'This device is not signed up for alerts.' })
      const ok = await send(sql, rows[0], { title: 'SabraTech alerts are on', body: 'This is how alerts will look on this device.', url: '/notifications' })
      return res.status(200).json({ ok })
    }

    // flush
    const batch = await sql`
      with q as (
        select id from notifications
         where pushed_at is null and created_at > now() - interval '1 day'
         order by created_at limit 200
         for update skip locked)
      update notifications n set pushed_at = now()
        from q where n.id = q.id
      returning n.id, n.user_id, n.kind, n.title, n.body, n.link`
    if (!batch.length) return res.status(200).json({ ok: true, sent: 0 })

    const users = [...new Set(batch.map(b => b.user_id))]
    const subs = await sql`select * from push_subscriptions where user_id = any(${users})`
    const prefs = await sql`select id, notify from profiles where id = any(${users})`
    const wants = (uid, kind) => (prefs.find(p => p.id === uid)?.notify?.[kind]?.push) !== false

    let sent = 0
    for (const a of batch) {
      if (!wants(a.user_id, a.kind)) continue
      for (const s of subs.filter(x => x.user_id === a.user_id)) {
        if (await send(sql, s, { title: a.title, body: a.body || '', url: a.link || '/notifications', tag: 'alert-' + a.id })) sent++
      }
    }
    return res.status(200).json({ ok: true, sent })
  } catch (e) {
    return res.status(200).json({ ok: false, error: e?.message || 'push failed' })
  }
}
