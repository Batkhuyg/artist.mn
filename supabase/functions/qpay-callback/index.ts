import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const QPAY_URL = 'https://merchant.qpay.mn/v2'

/* ── Token auto-refresh (create-qpay-invoice-тэй ижил) ─────── */
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
  const res = await fetch(`${QPAY_URL}/auth/token`, {
    method: 'POST',
    headers: { 'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`) },
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
    const url = new URL(req.url)
    const order_id = url.searchParams.get('order_id')
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id байхгүй' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, qpay_invoice_id')
      .eq('id', order_id)
      .single()

    if (!order?.qpay_invoice_id) {
      return new Response(JSON.stringify({ success: false, error: 'Invoice олдсонгүй', message: 'QPay invoice ID байхгүй байна' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (['paid', 'processing', 'processed'].includes(order.status)) {
      return new Response(JSON.stringify({ success: true, already_paid: true }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const token = await getQPayToken(supabase)

    const checkRes = await fetch(`${QPAY_URL}/payment/check`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        object_type: 'INVOICE',
        object_id: order.qpay_invoice_id,
        offset: { page_number: 1, page_limit: 100 },
      }),
    })

    if (!checkRes.ok) {
      const errText = await checkRes.text().catch(() => `HTTP ${checkRes.status}`)
      throw new Error(`QPay payment/check алдаа (${checkRes.status}): ${errText}`)
    }

    const checkData = await checkRes.json()
    const paidRow = checkData.rows?.find(
      (p: { payment_status: string }) => p.payment_status === 'PAID',
    )

    if (!paidRow) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Төлбөр баталгаажаагүй',
        count: checkData.rows?.length ?? 0,
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('orders')
      .update({
        status: 'paid',
        qpay_payment_id: paidRow?.payment_id ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Алдаа гарлаа'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
