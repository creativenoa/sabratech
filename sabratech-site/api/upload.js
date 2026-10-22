// Vercel serverless route: POST /api/upload
// Hands the browser a short-lived signed PUT link into Neon Object Storage,
// so storage credentials never reach the client.
//
// Required Vercel environment variables (from `neon env pull` / Neon Console):
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION
//   NEON_STORAGE_BUCKET   e.g. "sabratech-public" (a public_read bucket)
//
// Body: { bucket: 'talent-photos'|'talent-cvs', path, contentType, size }
// The legacy "bucket" names become key prefixes inside the one real bucket.

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const MAX_BYTES = 10 * 1024 * 1024 // 10MB

const RULES = {
  'talent-photos': /^image\//,
  'talent-cvs': /^application\/pdf$/,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' })

  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, AWS_REGION, NEON_STORAGE_BUCKET } = process.env
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_ENDPOINT_URL_S3 || !NEON_STORAGE_BUCKET) {
    return res.status(500).json({ error: 'Uploads are not configured yet' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
    const { bucket, path, contentType, size } = body

    const rule = RULES[bucket]
    if (!rule) return res.status(400).json({ error: 'Unknown upload type' })
    if (!rule.test(String(contentType || ''))) return res.status(400).json({ error: 'File type not allowed' })
    if (!size || size > MAX_BYTES) return res.status(400).json({ error: 'File is too large (max 10MB)' })

    // Only the generated filename survives — no client-controlled folders.
    const safeName = String(path || '').split('/').pop().replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName) return res.status(400).json({ error: 'Bad file name' })
    const key = `${bucket}/${safeName}`

    const s3 = new S3Client({
      region: AWS_REGION || 'us-east-2',
      endpoint: AWS_ENDPOINT_URL_S3,
      forcePathStyle: true, // Neon requires path-style addressing
      credentials: { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY },
    })

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: NEON_STORAGE_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    )

    const base = AWS_ENDPOINT_URL_S3.replace(/\/+$/, '')
    const publicUrl = `${base}/${NEON_STORAGE_BUCKET}/${key}`

    return res.status(200).json({ uploadUrl, publicUrl })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'unknown' })
  }
}
