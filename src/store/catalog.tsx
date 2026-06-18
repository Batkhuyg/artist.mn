import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase.ts'
import {
  type Album,
  type Artist,
  type Product,
  type SizeStock,
  groupArtists,
  parseSizeStock,
  rowToAlbum,
  rowToProduct,
} from '../data/catalog.ts'

interface CatalogCtx {
  products: Product[]
  merch: Product[]
  albums: Album[]
  artists: Artist[]
  findProduct: (id: string) => Product | undefined
  findAlbum: (id: string) => Album | undefined
  // Total remaining stock for an id (album or whole product), null when untracked.
  capacityOf: (id: string) => number | null
  // Per-size remaining for a merch id, null when none set.
  sizeStockOf: (id: string) => SizeStock | null
  ready: boolean
}

const empty: CatalogCtx = {
  products: [], merch: [], albums: [], artists: [],
  findProduct: () => undefined, findAlbum: () => undefined,
  capacityOf: () => null, sizeStockOf: () => null, ready: false,
}

const Ctx = createContext<CatalogCtx>(empty)

// Loads products + albums from Supabase once and exposes lists, finders, and stock.
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [capacity, setCapacity] = useState<Map<string, number>>(new Map())
  const [sizeStock, setSizeStock] = useState<Map<string, SizeStock>>(new Map())
  const [artistOrder, setArtistOrder] = useState<Map<string, number>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const [productRes, albumRes, artistRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('albums').select('*').order('sort_order', { ascending: true }).order('release_year', { ascending: false }),
        supabase.from('artists').select('id, sort_order'),
      ])

      const caps = new Map<string, number>()
      const sizes = new Map<string, SizeStock>()

      const productRows = productRes.data ?? []
      const albumRows = albumRes.data ?? []

      for (const row of productRows) {
        const id = String(row.id)
        if (typeof row.capacity_count === 'number') caps.set(id, row.capacity_count)
        const parsed = parseSizeStock(row.sizes)
        if (parsed) sizes.set(id, parsed)
      }
      for (const row of albumRows) {
        if (typeof row.capacity_count === 'number') caps.set(String(row.album_id), row.capacity_count)
      }

      const order = new Map<string, number>()
      for (const row of artistRes.data ?? []) {
        order.set(String(row.id), Number(row.sort_order) || 0)
      }

      if (!active) return
      setProducts(productRows.map(rowToProduct))
      setAlbums(albumRows.map(rowToAlbum))
      setCapacity(caps)
      setSizeStock(sizes)
      setArtistOrder(order)
      setReady(true)
    })()
    return () => {
      active = false
    }
  }, [])

  const value = useMemo<CatalogCtx>(() => {
    const productMap = new Map(products.map((p) => [p.id, p]))
    const albumMap = new Map(albums.map((a) => [a.album_id, a]))
    // albums already sorted by sort_order; order artist sections by artist sort_order.
    const artists = groupArtists(albums).sort(
      (a, b) => (artistOrder.get(a.id) ?? 0) - (artistOrder.get(b.id) ?? 0),
    )
    return {
      products,
      merch: products.filter((p) => p.kind === 'merch'),
      albums,
      artists,
      findProduct: (id) => productMap.get(id),
      findAlbum: (id) => albumMap.get(id),
      capacityOf: (id) => (capacity.has(id) ? capacity.get(id)! : null),
      sizeStockOf: (id) => sizeStock.get(id) ?? null,
      ready,
    }
  }, [products, albums, capacity, sizeStock, artistOrder, ready])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useCatalog = () => useContext(Ctx)
