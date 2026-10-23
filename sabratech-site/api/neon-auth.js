// Vercel serverless relay: /neon-auth/* → Neon Auth.
// vercel.json rewrites /neon-auth/:path* to /api/neon-auth?p=:path*
//
// Why this exists: the login cookie must belong to OUR domain (first-party) so
// it survives browser restarts and works in Safari. A plain Vercel rewrite
// can't do it — Neon's auth service routes by hostname and rejects proxied
// Host headers — so this function forwards each request itself and passes the
// Set-Cookie back, which the browser then stores against sabratech.vercel.app.

const UPSTREAM = 'https://ep-weathered-feather-axceeqgo.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth'

export default async function handler(req, res) {
  try {
    const { p = '', ...rest } = req.query || {}
    const path = Array.isArray(p) ? p.join('/') : p
    const qs = new URLSearchParams(rest).toString()

    const headers = { accept: 'application/json' }
    if (req.headers['content-type']) headers['content-type'] = req.headers['content-type']
    if (req.headers.cookie) headers.cookie = req.headers.cookie
    // The auth service validates this against its trusted-origins list
    // (both addresses are trusted in Neon Auth).
    const TRUSTED = ['https://atlanta-sabra.tech', 'https://sabratech.vercel.app']
    headers.origin = TRUSTED.includes(req.headers.origin) ? req.headers.origin : 'https://sabratech.vercel.app'

    let body
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {})
    }

    const upstream = await fetch(`${UPSTREAM}/${path}${qs ? `?${qs}` : ''}`, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    })

    res.statusCode = upstream.status
    res.setHeader('Cache-Control', 'no-store')
    // Upstream cookies are shaped for cross-site use (SameSite=None; Partitioned).
    // Served first-party from our own domain those attributes are wrong — and some
    // browsers discard such cookies on shutdown. Rewrite to a plain, persistent
    // first-party cookie (SameSite=Lax) that every browser keeps.
    const setCookies = (upstream.headers.getSetCookie?.() || []).map(c =>
      c.replace(/;\s*Partitioned/gi, '').replace(/;\s*SameSite=None/gi, '; SameSite=Lax'))
    if (setCookies.length) res.setHeader('Set-Cookie', setCookies)
    // The SDK reads its database-access JWT (and related tokens) from these
    // headers — dropping them logs people in but blinds every data query.
    for (const h of ['set-auth-jwt', 'set-auth-token']) {
      const v = upstream.headers.get(h)
      if (v) res.setHeader(h, v)
    }
    const loc = upstream.headers.get('location')
    if (loc) res.setHeader('Location', loc)
    const ct = upstream.headers.get('content-type')
    if (ct) res.setHeader('Content-Type', ct)

    const buf = Buffer.from(await upstream.arrayBuffer())
    res.end(buf)
  } catch (err) {
    res.statusCode = 502
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: err?.message || 'auth relay failed' }))
  }
}
