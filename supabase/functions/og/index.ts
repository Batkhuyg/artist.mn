// deno-lint-ignore-file no-explicit-any
/**
 * Supabase Edge Function: og
 *
 * Returns a minimal HTML page with Open Graph / Twitter meta for a given
 * album or product, so social crawlers (which don't run JS) get real previews.
 * nginx routes crawler user-agents here; humans get the SPA.
 *
 * Usage: /functions/v1/og?type=album|product&id=<id>
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://artist.mn').replace(/\/$/, '')
const DEFAULT_IMAGE = Deno.env.get('OG_DEFAULT_IMAGE') ?? `${SITE_URL}/og.png`

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const fmtMNT = (n: number) => new Intl.NumberFormat('mn-MN').format(n) + '₮'

function albumPrice(total_tracks: number, release_year: number): number {
  const raw = 9900 + total_tracks * 1200 + Math.max(0, release_year - 2005) * 300
  return Math.round(raw / 1000) * 1000 - 100
}

async function fetchRow(table: string, col: string, id: string): Promise<any | null> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(id)}&select=*&limit=1`
  const res = await fetch(url, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } })
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

function page(o: { title: string; desc: string; image: string; url: string; type: string }): string {
  return `<!doctype html><html lang="mn"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)} · ARTIST.MN</title>
<meta name="description" content="${esc(o.desc)}">
<meta property="og:site_name" content="ARTIST.MN">
<meta property="og:type" content="${esc(o.type)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:image" content="${esc(o.image)}">
<meta property="og:url" content="${esc(o.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(o.title)}">
<meta name="twitter:description" content="${esc(o.desc)}">
<meta name="twitter:image" content="${esc(o.image)}">
</head><body><a href="${esc(o.url)}">${esc(o.title)}</a></body></html>`
}

serve(async (req) => {
  const u = new URL(req.url)
  const type = u.searchParams.get('type') ?? ''
  const id = u.searchParams.get('id') ?? ''
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }

  let data: { title: string; desc: string; image: string; url: string; type: string } | null = null

  if (type === 'album' && id) {
    const a = await fetchRow('albums', 'album_id', id)
    if (a) {
      const price = fmtMNT(albumPrice(Number(a.total_tracks) || 0, Number(a.release_year) || 0))
      data = {
        title: a.title ?? 'Album',
        desc: `${a.artist_name ?? ''} · ${a.release_year ?? ''} · ${a.total_tracks ?? 0} дуу · ${price}`,
        image: a.cover_image || DEFAULT_IMAGE,
        url: `${SITE_URL}/album/${id}`,
        type: 'music.album',
      }
    }
  } else if (type === 'product' && id) {
    const p = await fetchRow('products', 'id', id)
    if (p) {
      const cover = String(p.cover ?? '')
      data = {
        title: p.title ?? 'Бараа',
        desc: p.description || p.desc || `${p.artist ?? ''} · ${fmtMNT(Number(p.price) || 0)}`,
        image: /^https?:\/\//.test(cover) ? cover : DEFAULT_IMAGE,
        url: `${SITE_URL}/product/${id}`,
        type: 'product',
      }
    }
  }

  if (!data) {
    data = {
      title: 'ARTIST.MN',
      desc: 'Уран бүтээлчдийн цомог, мерчендайз нэг дороос.',
      image: DEFAULT_IMAGE,
      url: SITE_URL,
      type: 'website',
    }
  }

  return new Response(page(data), { headers })
})
