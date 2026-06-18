import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { albumPrice } from '../data/catalog.ts'
import { useCatalog } from './catalog.tsx'

export interface LineMeta {
  title: string
  subtitle: string
  price: number
  cover?: string // gradient css (product)
  image?: string // url (album)
  kind: 'product' | 'album'
}

export interface BasketLine {
  id: string        // product id
  size?: string
  qty: number
}

// Result of an add — `ok` is false when stock capped the requested qty.
export interface AddResult {
  ok: boolean
  added: number
  available: number | null // remaining stock limit, null = untracked / unlimited
}

interface BasketCtx {
  lines: BasketLine[]
  count: number
  subtotal: number
  add: (id: string, size?: string, qty?: number) => AddResult
  setQty: (id: string, size: string | undefined, qty: number) => void
  remove: (id: string, size?: string) => void
  clear: () => void
  // Resolve a basket line id to display meta — works for products and albums.
  meta: (id: string) => LineMeta | null
}

const Ctx = createContext<BasketCtx | null>(null)
const KEY = 'philosophy_basket'

const sameLine = (a: BasketLine, id: string, size?: string) =>
  a.id === id && a.size === size

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as BasketLine[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(lines))
  }, [lines])

  const { capacityOf, sizeStockOf, findProduct, findAlbum } = useCatalog()

  const api = useMemo<BasketCtx>(() => {
    const meta = (id: string): LineMeta | null => {
      const p = findProduct(id)
      if (p) return { title: p.title, subtitle: p.artist, price: p.price, cover: p.cover, kind: 'product' }
      const a = findAlbum(id)
      if (a) return { title: a.title, subtitle: String(a.release_year), price: albumPrice(a), image: a.cover_image, kind: 'album' }
      return null
    }

    // Stock limit for a specific (id, size). null/Infinity = untracked / unlimited.
    // Per-size stock (merch) governs when present; otherwise the whole-item capacity.
    const limitFor = (id: string, size?: string): number => {
      const sizeMap = sizeStockOf(id)
      if (size && sizeMap && size in sizeMap) return sizeMap[size]
      const cap = capacityOf(id)
      return cap === null ? Infinity : cap
    }

    const add: BasketCtx['add'] = (id, size, qty = 1) => {
      const limit = limitFor(id, size)
      let result: AddResult = { ok: true, added: qty, available: isFinite(limit) ? limit : null }
      setLines((prev) => {
        // Stock is tracked per (id, size) line.
        const currentTotal = prev.reduce((n, l) => (sameLine(l, id, size) ? n + l.qty : n), 0)
        const room = limit - currentTotal
        const addQty = Math.max(0, Math.min(qty, room))
        result = { ok: addQty >= qty, added: addQty, available: isFinite(limit) ? limit : null }
        if (addQty === 0) return prev
        const i = prev.findIndex((l) => sameLine(l, id, size))
        if (i === -1) return [...prev, { id, size, qty: addQty }]
        const next = [...prev]
        next[i] = { ...next[i], qty: next[i].qty + addQty }
        return next
      })
      return result
    }

    const setQty: BasketCtx['setQty'] = (id, size, qty) => {
      const limit = limitFor(id, size)
      setLines((prev) => {
        const clamped = Math.min(qty, limit)
        return prev
          .map((l) => (sameLine(l, id, size) ? { ...l, qty: clamped } : l))
          .filter((l) => l.qty > 0)
      })
    }

    const remove: BasketCtx['remove'] = (id, size) =>
      setLines((prev) => prev.filter((l) => !sameLine(l, id, size)))

    const clear = () => setLines([])

    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((sum, l) => {
      const m = meta(l.id)
      return sum + (m ? m.price * l.qty : 0)
    }, 0)

    return { lines, count, subtotal, add, setQty, remove, clear, meta }
  }, [lines, capacityOf, sizeStockOf, findProduct, findAlbum])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useBasket() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBasket must be inside BasketProvider')
  return ctx
}
