import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBasket } from '../store/basket.tsx'
import { formatMNT, isImageUrl } from '../data/catalog.ts'
import BlurImage from './BlurImage.tsx'

export default function FloatingBasket() {
  const { lines, count, subtotal, setQty, remove, meta } = useBasket()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false) // collapsed by default
  const prevCountRef = useRef(count)

  useEffect(() => {
    const prevCount = prevCountRef.current
    prevCountRef.current = count
    if (count <= prevCount) return
    if (!window.matchMedia('(min-width: 640px)').matches) return
    setOpen(true)
  }, [count])

  // Hide on full basket / checkout pages.
  if (count === 0 || pathname === '/basket' || pathname === '/checkout') return null

  return (
    <div className="fixed bottom-3 right-3 z-30 w-[300px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-2xl">
      {/* compact header bar — always visible, toggles expand */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-elevated px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-bold">Сагс · {count}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{formatMNT(subtotal)}</span>
          <span className="text-[11px] text-ink-soft">{open ? '▾' : '▴'}</span>
        </span>
      </button>

      {open && (
        <>
          <ul className="max-h-[38vh] divide-y divide-line overflow-y-auto">
            {lines.map((l) => {
              const m = meta(l.id)
              if (!m) return null
              return (
                <li key={l.id + (l.size ?? '')} className="flex gap-2.5 p-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
                    {m.image ? (
                      <BlurImage src={m.image} alt={m.title} className="h-full w-full" />
                    ) : isImageUrl(m.cover) ? (
                      <BlurImage src={m.cover!} alt={m.title} className="h-full w-full" />
                    ) : (
                      <div className="h-full w-full" style={{ background: m.cover }} />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[12px] font-medium">{m.title}</p>
                      <button
                        onClick={() => remove(l.id, l.size)}
                        className="text-[12px] leading-none text-danger hover:underline"
                        aria-label="Устгах"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center rounded-[var(--radius-pill)] bg-bg">
                        <button onClick={() => setQty(l.id, l.size, l.qty - 1)}
                          className="h-6 w-6 text-[14px] text-ink-soft hover:text-ink" aria-label="Хасах">−</button>
                        <span className="w-5 text-center text-[11px]">{l.qty}</span>
                        <button onClick={() => setQty(l.id, l.size, l.qty + 1)}
                          className="h-6 w-6 text-[14px] text-ink-soft hover:text-ink" aria-label="Нэмэх">+</button>
                      </div>
                      <span className="text-[12px] font-medium">{formatMNT(m.price * l.qty)}</span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-line p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] text-ink-soft">Нийт дүн</span>
              <span className="text-[14px] font-bold">{formatMNT(subtotal)}</span>
            </div>
            <Link
              to="/basket"
              className="block rounded-[var(--radius-pill)] bg-ink py-2 text-center text-[13px] font-medium text-bg hover:bg-white/90"
            >
              Үргэлжлүүлэх
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
