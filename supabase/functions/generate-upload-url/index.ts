// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function: generate-upload-url
 *
 * Returns a presigned PUT URL for DigitalOcean Spaces (shared shots-mn-media space,
 * artist.mn/* folders) using aws4fetch. Auth: requires a Supabase JWT.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'
import { authenticateSupabaseJwt } from '../_shared/auth.ts'

const ALLOWED_FOLDERS = new Set(['artist.mn/merch', 'artist.mn/albums', 'artist.mn/artists'])
const PRESIGN_EXPIRES_SEC = 300 // 5 минут

const SPACES_ACCESS_KEY = Deno.env.get('SPACES_ACCESS_KEY') ?? ''
const SPACES_SECRET_KEY = Deno.env.get('SPACES_SECRET_KEY') ?? ''
const SPACES_REGION = Deno.env.get('SPACES_REGION') ?? 'sgp1'
const SPACES_BUCKET = Deno.env.get('SPACES_BUCKET') ?? ''
const SPACES_PUBLIC_URL = (Deno.env.get('SPACES_PUBLIC_URL') ?? '').replace(/\/$/, '')
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGIN') ?? '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const aws = new AwsClient({
  accessKeyId: SPACES_ACCESS_KEY,
  secretAccessKey: SPACES_SECRET_KEY,
  service: 's3',
  region: SPACES_REGION,
})

function resolveOrigin(req: Request): string {
  if (ALLOWED_ORIGINS.includes('*')) return '*'
  const origin = req.headers.get('Origin') ?? ''
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] ?? '*'
}

function corsHeadersFor(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeadersFor(req) })
  }
  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' })
  }

  // 1. Validate auth
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json(req, 401, { error: 'Missing bearer token' })
  }
  try {
    await authenticateSupabaseJwt(authHeader)
  } catch (err) {
    return json(req, 401, { error: 'Invalid token', detail: String(err) })
  }

  // 2. Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, 400, { error: 'Invalid JSON' })
  }

  const folder = String(body.folder ?? '')
  const filename = String(body.filename ?? '')
  const contentType = String(body.contentType ?? 'application/octet-stream')

  if (!ALLOWED_FOLDERS.has(folder)) {
    return json(req, 400, { error: 'Invalid folder', allowed: [...ALLOWED_FOLDERS] })
  }
  if (!filename || filename.includes('..')) {
    return json(req, 400, { error: 'Invalid filename' })
  }
  if (!SPACES_ACCESS_KEY || !SPACES_SECRET_KEY || !SPACES_BUCKET || !SPACES_PUBLIC_URL) {
    return json(req, 500, { error: 'Spaces not configured on server' })
  }

  // 3. Build presigned URL with aws4fetch
  const key = `${folder}/${filename}`
  const host = `${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com`
  const urlToSign =
    `https://${host}/${encodeURIComponent(key).replace(/%2F/g, '/')}` +
    `?X-Amz-Expires=${PRESIGN_EXPIRES_SEC}`

  try {
    const signed = await aws.sign(urlToSign, {
      method: 'PUT',
      headers: {
        'x-amz-acl': 'public-read',
        'content-type': contentType,
      },
      aws: { signQuery: true },
    })
    const uploadUrl = signed.url
    const publicUrl = `${SPACES_PUBLIC_URL}/${key}`
    return json(req, 200, { uploadUrl, publicUrl, key })
  } catch (err) {
    console.error('Presign error:', err)
    return json(req, 500, { error: 'Failed to presign', detail: String(err) })
  }
})
