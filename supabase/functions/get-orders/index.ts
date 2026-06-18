import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type OrderItemRow = {
  line_id: string
  kind: string
  title: string
  price: number
  qty: number
  size: string | null
}

type OrderRow = {
  id: string
  status: string
  subtotal: number | null
  shipping: number | null
  total: number | null
  customer_name: string | null
  customer_phone: string | null
  address: string | null
  unit: string | null
  note: string | null
  created_at: string
  paid_at: string | null
  qpay_invoice_id: string | null
  order_items: OrderItemRow[] | null
}

function shapeOrder(order: OrderRow) {
  const items = order.order_items ?? []
  return {
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping ?? 0,
    total_amount: order.total,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    address: order.address,
    unit: order.unit,
    note: order.note,
    created_at: order.created_at,
    paid_at: order.paid_at,
    item_count: items.reduce((n, it) => n + it.qty, 0),
    items: items.map((it) => ({
      line_id: it.line_id,
      kind: it.kind,
      title: it.title,
      price: it.price,
      qty: it.qty,
      size: it.size,
    })),
  }
}

function emptyStatusCounts() {
  return { all: 0, pending: 0, paid: 0, processing: 0, processed: 0, cancelled: 0 }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { customer_id, page = 1, limit = 5, order_id, status } = await req.json()
    if (!customer_id) {
      return new Response(JSON.stringify({ error: 'customer_id шаардлагатай' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 50)
    const safePage = Math.max(Number(page) || 1, 1)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: statusRows, error: statusError } = await supabase
      .from('orders')
      .select('status')
      .eq('customer_id', customer_id)

    if (statusError) throw new Error(statusError.message)

    const statusCounts = (statusRows ?? []).reduce((acc, row: { status: string }) => {
      if (row.status in acc) acc[row.status as keyof typeof acc] += 1
      acc.all += 1
      return acc
    }, emptyStatusCounts())

    let query = supabase
      .from('orders')
      .select(`
        id, status, subtotal, shipping, total,
        customer_name, customer_phone, address, unit, note,
        created_at, paid_at, qpay_invoice_id,
        order_items ( line_id, kind, title, price, qty, size )
      `, { count: 'exact' })
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)

    if (order_id) {
      query = query.eq('id', order_id)
    } else {
      const from = (safePage - 1) * safeLimit
      query = query.range(from, from + safeLimit - 1)
    }

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    const orders = ((data ?? []) as OrderRow[]).map(shapeOrder)
    const total = order_id ? orders.length : (count ?? 0)
    const totalPages = order_id ? (orders.length > 0 ? 1 : 0) : Math.ceil(total / safeLimit)

    return new Response(JSON.stringify({
      orders,
      status_counts: statusCounts,
      pagination: {
        page: order_id ? 1 : safePage,
        limit: order_id ? orders.length || 1 : safeLimit,
        total,
        total_pages: totalPages,
        has_prev: !order_id && safePage > 1,
        has_next: !order_id && safePage < totalPages,
      },
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
