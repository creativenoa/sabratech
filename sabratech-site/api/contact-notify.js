// Vercel serverless route: POST /api/contact-notify
// Emails every admin when a Contact Us message arrives.
//
// Required Vercel environment variables:
//   RESEND_API_KEY   from resend.com
//   CONTACT_FROM     e.g. "SabraTech <onboarding@resend.dev>"
//                    (swap to your own domain once sabratech.ai is verified)
//   DATABASE_URL     Neon connection string (server-side only, bypasses RLS)
//
// This route always returns 200. The message is already saved in the database
// before this is called, so a mail failure must never look like a submit failure.

import { neon } from '@neondatabase/serverless'

const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })

  const { RESEND_API_KEY, CONTACT_FROM, DATABASE_URL } = process.env
  if (!RESEND_API_KEY || !DATABASE_URL) {
    return res.status(200).json({ ok: false, skipped: 'missing env' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { first_name, last_name, email, phone, message } = body

    const sql = neon(DATABASE_URL)
    const admins = await sql`select email from profiles where is_admin = true and status = 'approved'`.catch(() => [])
    const to = admins.map(a => a.email).filter(Boolean)
    if (!to.length) return res.status(200).json({ ok: false, skipped: 'no admin recipients' })

    const html = `
      <div style="font-family:Helvetica,Arial,sans-serif;color:#292929;line-height:1.6">
        <h2 style="color:#28315E;margin:0 0 16px">New Contact-Us inquiry</h2>
        <p><strong>Name:</strong> ${esc(first_name)} ${esc(last_name)}</p>
        <p><strong>Email:</strong> ${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : 'not provided'}</p>
        <p><strong>Phone:</strong> ${phone ? esc(phone) : 'not provided'}</p>
        <hr style="border:none;border-top:1px solid #D9D9D9;margin:20px 0" />
        <p style="white-space:pre-wrap">${esc(message)}</p>
        <p style="margin-top:24px;font-size:12px;color:#888">
          Sent from sabratech.vercel.app — also saved in Admin → Contact.
        </p>
      </div>`

    const mail = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM || 'SabraTech <onboarding@resend.dev>',
        to,
        reply_to: email || undefined,
        subject: 'SabraTech Contact-Us Inquiry',
        html,
      }),
    })

    if (!mail.ok) {
      return res.status(200).json({ ok: false, error: await mail.text().catch(() => 'send failed') })
    }
    return res.status(200).json({ ok: true, sent: to.length })
  } catch (err) {
    return res.status(200).json({ ok: false, error: err?.message || 'unknown' })
  }
}
