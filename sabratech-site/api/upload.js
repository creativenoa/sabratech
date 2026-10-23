// Vercel serverless route: POST /api/upload
// Hands a LOGGED-IN browser a short-lived signed PUT link into Neon Object
// Storage, so storage credentials never reach the client.
//
// Login is required (checked server-side from the session cookie, see
// api/_lib/session.js). Approval is NOT required: brand-new members upload their
// photo before an admin approves them.
//
// Required Vercel environment variables:
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
//   NEON_STORAGE_BUCKET   e.g. "sabratech-public"
//   DATABASE_URL          (session lookup)
//
// Body: { bucket: 'talent-photos'|'talent-cvs'|'event-images', path, contentType, size }
// The legacy "bucket" names become key prefixes inside the one real bucket.
// Every key is bound to the uploader: <prefix>/<user id>/<random file name>.
// The returned publicUrl is only an identifier now — the files are shown through
// /api/file, which checks who is asking (members only).

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getUser, storageConfig } from './_lib/session.js'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

const RULES = {
  'talent-photos': /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/,
  'talent-cvs': /^application\/pdf$/,
  'event-images': /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/,
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const cfg = storageConfig()
  if (!cfg) return res.status(500).json({ error: 'Uploads are not configured yet' })

  try {
    const user = await getUser(req)
    if (!user || !/^[A-Za-z0-9-]{1,64}$/.test(user.id)) {
      return res.status(401).json({ error: 'Please log in to upload files' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { bucket, path, contentType, size } = body

    const rule = RULES[bucket]
    if (!rule) return res.status(400).json({ error: 'Unknown upload type' })
    if (!rule.test(String(contentType || ''))) return res.status(400).json({ error: 'File type not allowed' })
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return res.status(400).json({ error: 'File is too large (max 10MB)' })

    // Only the generated filename survives — no client-controlled folders.
    const safeName = String(path || '').split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+/, '').slice(0, 120)
    if (!safeName) return res.status(400).json({ error: 'Bad file name' })
    const key = `${bucket}/${user.id}/${safeName}`

    const s3 = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: true, // Neon requires path-style addressing
      credentials: cfg.credentials,
    })

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 120 },
    )

    const publicUrl = `${cfg.endpoint}/${cfg.bucket}/${key}`
    return res.status(200).json({ uploadUrl, publicUrl })
  } catch {
    return res.status(500).json({ error: 'Could not start the upload' })
  }
}
