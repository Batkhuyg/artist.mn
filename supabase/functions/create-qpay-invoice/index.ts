import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const QPAY_URL = 'https://merchant.qpay.mn/v2'

/* ── Token auto-refresh ─────────────────────────────────────── */
async function getQPayToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: row } = await supabase
    .from('qpay_tokens')
    .select('*')
    .eq('id', 1)
    .single()

  if (row && new Date(row.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return row.access_token
  }

  if (row?.refresh_token) {
    const res = await fetch(`${QPAY_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${row.refresh_token}` },
    })
    if (res.ok) {
      const data = await res.json()
      const expiresAt = new Date(data.expires_in * 1000)
      await supabase.from('qpay_tokens').upsert({
        id: 1,
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? row.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      return data.access_token
    }
  }

  const clientId = Deno.env.get('QPAY_CLIENT_ID')!
  const clientSecret = Deno.env.get('QPAY_CLIENT_SECRET')!
  if (!clientId || !clientSecret) throw new Error('QPAY_CLIENT_ID эсвэл QPAY_CLIENT_SECRET тохируулаагүй байна')
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`QPay token алдаа (${res.status}): ${errText}`)
  }
  const data = await res.json()
  const expiresAt = new Date(data.expires_in * 1000)
  await supabase.from('qpay_tokens').upsert({
    id: 1,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  })
  return data.access_token
}

/* ── Main ───────────────────────────────────────────────────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { order_id, customer_id } = await req.json()
    if (!order_id || !customer_id) {
      return new Response(JSON.stringify({ error: 'order_id, customer_id шаардлагатай' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, status, qpay_invoice_id, total')
      .eq('id', order_id)
      .eq('customer_id', customer_id)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Захиалга олдсонгүй' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const amount = Number(order.total ?? 0)
    if (amount <= 0) {
      return new Response(JSON.stringify({ error: 'Төлөх дүн 0 байна' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Энэ захиалга төлбөр төлөх төлөвт биш байна' }), {
        status: 409, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const token = await getQPayToken(supabase)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!

    const invoiceRes = await fetch(`${QPAY_URL}/invoice`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice_code: Deno.env.get('QPAY_INVOICE_CODE')!,
        sender_invoice_no: order_id,
        invoice_receiver_code: 'terminal',
        invoice_description: 'ARTIST.MN захиалга',
        amount,
        callback_url: `${supabaseUrl}/functions/v1/qpay-callback?order_id=${order_id}`,
      }),
    })

    if (!invoiceRes.ok) {
      const err = await invoiceRes.text()
      throw new Error(`QPay invoice алдаа: ${err}`)
    }

    const invoice = await invoiceRes.json()

    const { error: updateError } = await supabase
      .from('orders')
      .update({ qpay_invoice_id: invoice.invoice_id })
      .eq('id', order_id)

    if (updateError) throw new Error(`QPay invoice хадгалахад алдаа: ${updateError.message}`)

    return new Response(JSON.stringify({
      invoice_id: invoice.invoice_id,
      qr_image: invoice.qr_image,
      qr_text: invoice.qr_text,
      urls: invoice.urls ?? [],
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Алдаа гарлаа'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
