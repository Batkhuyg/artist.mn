import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SHIPPING_FEE = 10000

interface LineInput {
  line_id: string
  qty: number
  size?: string | null
}

// Album price derived deterministically from track count + recency.
// Must stay in sync with src/data/albums.ts albumPrice().
function albumPrice(totalTracks: number, releaseYear: number | null): number {
  const base = 9900
  const perTrack = 1200
  const recency = Math.max(0, (releaseYear ?? 0) - 2005) * 300
  const raw = base + totalTracks * perTrack + recency
  return Math.round(raw / 1000) * 1000 - 100
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { customer_id, lines, delivery } = await req.json() as {
      customer_id?: string
      lines?: LineInput[]
      delivery?: { name?: string; phone?: string; address?: string; unit?: string; note?: string }
    }

    if (!customer_id || !Array.isArray(lines) || lines.length === 0) {
      return new Response(JSON.stringify({ error: 'customer_id болон lines шаардлагатай' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    if (!delivery?.phone || !delivery?.address) {
      return new Response(JSON.stringify({ error: 'Утас, хаяг шаардлагатай' }), {
        status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Resolve catalog rows server-side so prices can't be forged by the client.
    const ids = [...new Set(lines.map((l) => l.line_id))]
    const [{ data: products }, { data: albums }] = await Promise.all([
      supabase.from('products').select('id, kind, title, price').in('id', ids),
      supabase.from('albums').select('album_id, title, total_tracks, release_year').in('album_id', ids),
    ])

    const productMap = new Map((products ?? []).map((p) => [p.id, p]))
    const albumMap = new Map((albums ?? []).map((a) => [a.album_id, a]))

    const items: { line_id: string; kind: string; title: string; price: number; qty: number; size: string | null }[] = []
    for (const line of lines) {
      const qty = Math.max(1, Math.floor(Number(line.qty) || 1))
      const product = productMap.get(line.line_id)
      const album = albumMap.get(line.line_id)
      if (product) {
        items.push({ line_id: line.line_id, kind: 'product', title: product.title, price: product.price, qty, size: line.size ?? null })
      } else if (album) {
        items.push({ line_id: line.line_id, kind: 'album', title: album.title, price: albumPrice(album.total_tracks, album.release_year), qty, size: line.size ?? null })
      } else {
        return new Response(JSON.stringify({ error: `Бараа олдсонгүй: ${line.line_id}` }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' },
        })
      }
    }

    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0)
    const shipping = SHIPPING_FEE
    const total = subtotal + shipping

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_id,
        customer_name: delivery.name ?? delivery.phone,
        customer_phone: delivery.phone,
        address: delivery.address,
        unit: delivery.unit ?? null,
        note: delivery.note ?? null,
        subtotal,
        shipping,
        total,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderErr || !order) throw new Error(orderErr?.message ?? 'Захиалга үүсгэхэд алдаа гарлаа')

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(items.map((it) => ({ ...it, order_id: order.id })))

    if (itemsErr) throw new Error(itemsErr.message)

    return new Response(JSON.stringify({ order_id: order.id, subtotal, shipping, total }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Алдаа гарлаа'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
