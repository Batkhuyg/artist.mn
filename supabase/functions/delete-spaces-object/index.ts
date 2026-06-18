// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function: delete-spaces-object
 *
 * Deletes an object from DO Spaces (artist.mn/* keys only) using aws4fetch.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20'
import { authenticateSupabaseJwt } from '../_shared/auth.ts'

const ALLOWED_PREFIXES = ['artist.mn/']

const SPACES_ACCESS_KEY = Deno.env.get('SPACES_ACCESS_KEY') ?? ''
const SPACES_SECRET_KEY = Deno.env.get('SPACES_SECRET_KEY') ?? ''
const SPACES_REGION = Deno.env.get('SPACES_REGION') ?? 'sgp1'
const SPACES_BUCKET = Deno.env.get('SPACES_BUCKET') ?? ''
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

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json(req, 401, { error: 'Missing bearer token' })
  }
  try {
    await authenticateSupabaseJwt(authHeader)
  } catch (err) {
    return json(req, 401, { error: 'Invalid token', detail: String(err) })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json(req, 400, { error: 'Invalid JSON' })
  }

  const key = String(body.key ?? '')
  if (!key || !ALLOWED_PREFIXES.some((p) => key.startsWith(p))) {
    return json(req, 400, { error: 'Invalid key' })
  }
  if (!SPACES_ACCESS_KEY || !SPACES_SECRET_KEY || !SPACES_BUCKET) {
    return json(req, 500, { error: 'Spaces not configured' })
  }

  const host = `${SPACES_BUCKET}.${SPACES_REGION}.digitaloceanspaces.com`
  const url = `https://${host}/${encodeURIComponent(key).replace(/%2F/g, '/')}`

  try {
    const res = await aws.fetch(url, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) {
      const txt = await res.text().catch(() => '')
      console.error('Delete failed:', res.status, txt)
      return json(req, 500, { error: 'Delete failed', status: res.status })
    }
    return json(req, 200, { ok: true })
  } catch (err) {
    console.error('Delete error:', err)
    return json(req, 500, { error: 'Delete failed', detail: String(err) })
  }
})
