// Vercel serverless route: GET /api/file?key=talent-photos/<...>
// Members-only access to stored files (photos, CVs, event images).
//
// The login cookie is first-party, so a plain <img src="/api/file?key=..."> or a
// CV link sends it automatically. We check who is asking and, if allowed,
// 302-redirect to a short-lived signed link straight into Neon Object Storage.
//
// Who may see a file:
//   - approved members (admins are approved members too), or
//   - the person the file belongs to — so a pending member can preview their own
//     photo before approval. "Belongs to" = the key's user folder is theirs
//     (new uploads: <prefix>/<user id>/<name>), or one of their own listings
//     (talents.owner_id) points at this file (older uploads without a user folder).
//
// Works whether the bucket is public_read or private.

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getUser, storageConfig, db, FILE_PREFIXES } from './_lib/session.js'

const KEY_RE = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+){1,3}$/

// Signed links are "bucketed" to a 10-minute window: inside one window the same
// file always gets the same link, so the browser can reuse the downloaded image
// instead of fetching it again on every page view. Each link lives ≤ 20 minutes.
const WINDOW_S = 600

let _s3
function s3For(cfg) {
  // Checksum options off: keeps the signed GET link a plain S3 link (no extra
  // x-amz-checksum query parameters).
  if (!_s3) _s3 = new S3Client({
    region: cfg.region, endpoint: cfg.endpoint, forcePathStyle: true, credentials: cfg.credentials,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
  })
  return _s3
}

function deny(res, code, msg) {
  res.statusCode = code
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(msg)
}

async function ownsLegacyFile(userId, key) {
  const sql = db()
  if (!sql) return false
  const tail = '/' + key
  try {
    const rows = await sql`
      select 1 from public.talents
       where owner_id::text = ${userId}
         and (right(coalesce(photo_url, ''), ${tail.length}) = ${tail}
           or right(coalesce(cv_url, ''), ${tail.length}) = ${tail})
       limit 1`
    return rows.length > 0
  } catch { return false }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return deny(res, 405, 'method')

  const cfg = storageConfig()
  if (!cfg) return deny(res, 500, 'Storage is not configured')

  const key = String(req.query?.key || '')
  if (key.length > 300 || !KEY_RE.test(key) || key.includes('..') || !FILE_PREFIXES.includes(key.split('/')[0])) {
    return deny(res, 400, 'Bad file key')
  }

  const user = await getUser(req)
  if (!user) return deny(res, 401, 'Log in to view this file')

  let allowed = user.approved
  if (!allowed && key.split('/')[1] === user.id) allowed = true
  if (!allowed) allowed = await ownsLegacyFile(user.id, key)
  if (!allowed) return deny(res, 403, 'Members only')

  try {
    const now = Math.floor(Date.now() / 1000)
    const signingDate = new Date((now - (now % WINDOW_S)) * 1000)
    const url = await getSignedUrl(
      s3For(cfg),
      new GetObjectCommand({ Bucket: cfg.bucket, Key: key }),
      { expiresIn: WINDOW_S * 2, signingDate },
    )
    res.statusCode = 302
    res.setHeader('Location', url)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.end()
  } catch {
    return deny(res, 500, 'Could not open the file')
  }
}
