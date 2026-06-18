import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'npm:jose@5.9.6'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') ?? ''

const textEncoder = new TextEncoder()

const jwks = SUPABASE_URL
  ? createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null

export async function authenticateSupabaseJwt(authHeader: string): Promise<void> {
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Missing bearer token')
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) {
    throw new Error('Missing bearer token')
  }

  const algorithm = decodeProtectedHeader(token).alg
  if (!algorithm) {
    throw new Error('JWT header is missing alg')
  }

  if (jwks && algorithm !== 'HS256') {
    await verifyWithJwks(token)
    return
  }

  if (SUPABASE_JWT_SECRET) {
    await verifyWithSecret(token)
    return
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    await verifyViaUserEndpoint(authHeader)
    return
  }

  throw new Error('Supabase auth is not configured on server')
}

async function verifyWithJwks(token: string): Promise<void> {
  if (!jwks) throw new Error('JWKS is not configured')

  const { payload } = await jwtVerify(token, jwks, {
    issuer: `${SUPABASE_URL}/auth/v1`,
  })

  assertAuthenticated(payload)
}

async function verifyWithSecret(token: string): Promise<void> {
  const secret = textEncoder.encode(SUPABASE_JWT_SECRET)
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
    issuer: `${SUPABASE_URL}/auth/v1`,
  })

  assertAuthenticated(payload)
}

async function verifyViaUserEndpoint(authHeader: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(detail || `HTTP ${res.status}`)
  }
}

function assertAuthenticated(payload: { [key: string]: unknown }) {
  const role = typeof payload.role === 'string' ? payload.role : ''
  const sub = typeof payload.sub === 'string' ? payload.sub : ''

  if (!sub) {
    throw new Error('JWT payload is missing sub')
  }

  if (role && role !== 'authenticated') {
    throw new Error(`Invalid role: ${role}`)
  }
}
