// Server-side "who is calling?" for our serverless routes.
// (Files under api/_lib are helpers, not routes — Vercel skips "_" paths.)
//
// The browser holds a first-party login cookie (set through the /neon-auth relay,
// see api/neon-auth.js), named "__Secure-neon-auth.session_token" in production.
// Its value is "<session token>.<signature>". Neon Auth (Better Auth) keeps every
// live session in neon_auth.session, so we look the token up there directly with
// DATABASE_URL — one fast query that also returns the member's approval status.
// If that lookup finds nothing (e.g. Neon changes how tokens are stored), we fall
// back to asking Neon Auth itself (/get-session) with the same cookie.
//
// Returns { id, status, isAdmin, approved } or null when not logged in.

import { neon } from '@neondatabase/serverless'

const AUTH_UPSTREAM = 'https://ep-weathered-feather-axceeqgo.neonauth.c-4.us-east-2.aws.neon.tech/neondb/auth'

let _sql
export function db() {
  if (!process.env.DATABASE_URL) return null
  if (!_sql) _sql = neon(process.env.DATABASE_URL)
  return _sql
}

// Short per-instance memory so a page with 40 photos is not 40 identical lookups.
const CACHE_MS = 30 * 1000
const cache = new Map()

function tokensFrom(cookieHeader) {
  const out = []
  for (const part of String(cookieHeader || '').split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const name = part.slice(0, i).trim()
    if (!/(^|[._-])session_token$/.test(name)) continue
    let v = part.slice(i + 1).trim()
    try { v = decodeURIComponent(v) } catch { /* keep raw */ }
    const token = v.split('.')[0]
    if (/^[A-Za-z0-9_-]{16,200}$/.test(token)) out.push({ raw: `${name}=${part.slice(i + 1).trim()}`, token })
  }
  return out
}

async function profileOf(sql, id) {
  const rows = await sql`select status, coalesce(is_admin, false) as is_admin from public.profiles where id::text = ${id} limit 1`
  return rows[0] || null
}

const shape = (id, p) => ({
  id: String(id),
  status: p?.status || null,
  isAdmin: !!p?.is_admin && p?.status === 'approved',
  approved: p?.status === 'approved',
})

export async function getUser(req) {
  const found = tokensFrom(req.headers?.cookie)
  if (!found.length) return null

  const key = found.map(f => f.token).join(',')
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now()) return hit.user

  const sql = db()
  let user = null

  // 1) Direct lookup in Neon Auth's session table.
  if (sql) {
    try {
      const rows = await sql`
        select s."userId"::text as id, p.status, coalesce(p.is_admin, false) as is_admin
          from neon_auth.session s
          left join public.profiles p on p.id::text = s."userId"::text
         where s.token = any(${found.map(f => f.token)})
           and s."expiresAt" > now()
         limit 1`
      if (rows[0]) user = shape(rows[0].id, rows[0])
    } catch { /* fall through to the auth service */ }
  }

  // 2) Fallback: ask Neon Auth, forwarding only the session cookie(s).
  if (!user) {
    try {
      const ctl = new AbortController()
      const t = setTimeout(() => ctl.abort(), 4000)
      const r = await fetch(`${AUTH_UPSTREAM}/get-session`, {
        headers: { accept: 'application/json', cookie: found.map(f => f.raw).join('; '), origin: 'https://sabratech.vercel.app' },
        signal: ctl.signal,
      }).finally(() => clearTimeout(t))
      const body = r.ok ? await r.json().catch(() => null) : null
      const id = body?.user?.id
      if (id) user = shape(id, sql ? await profileOf(sql, String(id)).catch(() => null) : null)
    } catch { /* not logged in */ }
  }

  if (cache.size > 500) cache.clear()
  cache.set(key, { user, exp: Date.now() + CACHE_MS })
  return user
}

// ---------- Storage ----------
export const FILE_PREFIXES = ['talent-photos', 'talent-cvs', 'event-images']

export function storageConfig() {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION, NEON_STORAGE_BUCKET } = process.env
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !NEON_STORAGE_BUCKET) return null
  return {
    bucket: NEON_STORAGE_BUCKET,
    endpoint: AWS_ENDPOINT_URL_S3.replace(/\/+$/, ''),
    region: AWS_REGION || 'us-east-2',
    credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
  }
}
