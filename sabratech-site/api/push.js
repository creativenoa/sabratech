// Vercel serverless route: /api/push — delivers alerts to phones (web push)
// and by email (Resend). The name stayed /api/push for compatibility.
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

const SITE = 'https://atlanta-sabra.tech'

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

const esc = s => String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]))

// Alert types whose email is OFF unless the member turns it on (could be
// many emails a day as the community grows; Resend's free plan is 100/day).
const EMAIL_OPT_IN = new Set(['new_members'])

const alertEmail = a => {
  const url = SITE + (a.link || '/notifications')
  return `
  <div style="font-family:Helvetica,Arial,sans-serif;color:#292929;line-height:1.6;max-width:520px">
    <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#00A5E0;margin:0 0 8px">SabraTech</p>
    <h2 style="color:#28315E;margin:0 0 12px;font-size:20px">${esc(a.title)}</h2>
    ${a.body ? `<p style="margin:0 0 20px;color:#555">${esc(a.body)}</p>` : ''}
    <a href="${esc(url)}" style="display:inline-block;background:#00A5E0;color:#fff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:6px">Open SabraTech</a>
    <p style="margin-top:28px;font-size:12px;color:#999">You get this because of your alert settings.
      <a href="${SITE}/notifications" style="color:#999">Change which emails you get</a>.</p>
  </div>`
}

async function sendEmail(to, a) {
  const { RESEND_API_KEY, CONTACT_FROM } = process.env
  if (!RESEND_API_KEY || !to) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': 'alert-' + a.id + '-' + to },
    body: JSON.stringify({
      from: CONTACT_FROM || 'SabraTech <hello@atlanta-sabra.tech>',
      to: [to], subject: a.title, html: alertEmail(a),
      text: `${a.title}\n\n${a.body || ''}\n\n${SITE}${a.link || '/notifications'}`,
    }),
  }).catch(() => null)
  return !!r?.ok
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
    const prefs = await sql`select id, email, notify from profiles where id = any(${users})`
    const pref = (uid, kind, ch) => prefs.find(p => p.id === uid)?.notify?.[kind]?.[ch]
    const wantsPush = (uid, kind) => pref(uid, kind, 'push') !== false
    const wantsEmail = (uid, kind) => (EMAIL_OPT_IN.has(kind) ? pref(uid, kind, 'email') === true : pref(uid, kind, 'email') !== false)

    let sent = 0, emailed = 0
    for (const a of batch) {
      if (wantsPush(a.user_id, a.kind)) {
        for (const s of subs.filter(x => x.user_id === a.user_id)) {
          if (await send(sql, s, { title: a.title, body: a.body || '', url: a.link || '/notifications', tag: 'alert-' + a.id })) sent++
        }
      }
      if (wantsEmail(a.user_id, a.kind)) {
        if (await sendEmail(prefs.find(p => p.id === a.user_id)?.email, a)) emailed++
      }
    }
    return res.status(200).json({ ok: true, sent, emailed })
  } catch (e) {
    return res.status(200).json({ ok: false, error: e?.message || 'push failed' })
  }
}
