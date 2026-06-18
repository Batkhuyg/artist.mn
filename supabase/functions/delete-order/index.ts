import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { order_id, customer_id } = await req.json() as {
      order_id?: string
      customer_id?: string
    }

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
      .select('id, status')
      .eq('id', order_id)
      .eq('customer_id', customer_id)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Захиалга олдсонгүй' }), {
        status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    if (order.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Төлөгдсөн захиалгыг устгах боломжгүй' }), {
        status: 409, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const { error: itemsErr } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', order_id)

    if (itemsErr) throw new Error(itemsErr.message)

    const { error: deleteErr } = await supabase
      .from('orders')
      .delete()
      .eq('id', order_id)
      .eq('customer_id', customer_id)

    if (deleteErr) throw new Error(deleteErr.message)

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
