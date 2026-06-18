import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Phone login WITHOUT SMS: upsert the customer by phone and return it directly.
// (Mirrors shots.mn, where the phone path skips OTP verification entirely.)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { phone } = await req.json()
    if (!/^\d{8}$/.test(String(phone))) {
      return new Response(JSON.stringify({ error: 'Зөв утасны дугаар шаардлагатай' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: customer, error } = await supabase
      .from('customers')
      .upsert({ phone }, { onConflict: 'phone' })
      .select()
      .single()

    if (error || !customer) {
      throw new Error(error?.message ?? 'Хэрэглэгч үүсгэхэд алдаа гарлаа')
    }

    return new Response(JSON.stringify({ customer }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Алдаа гарлаа'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
