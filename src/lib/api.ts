// Supabase Edge Function client (shots.mn pattern).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export interface Customer {
  id: string
  phone: string | null
  email: string | null
  created_at: string
}

function fnHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${KEY}`,
    'apikey': KEY,
  }
}

// POST a JSON body to an edge function and return parsed JSON (throws on !ok).
export async function callFn<T = unknown>(name: string, body: unknown, query = ''): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}${query}`, {
    method: 'POST',
    headers: fnHeaders(),
    body: JSON.stringify(body ?? {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Алдаа гарлаа')
  return data as T
}
