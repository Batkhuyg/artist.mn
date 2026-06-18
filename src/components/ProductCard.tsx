import { Link } from 'react-router-dom'
import { type Product, formatMNT, isImageUrl } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import { useCatalog } from '../store/catalog.tsx'
import BlurImage from './BlurImage.tsx'

export default function ProductCard({ p }: { p: Product }) {
  const { lines, setQty } = useBasket()
  const { capacityOf, sizeStockOf } = useCatalog()
  const basketLines = lines.filter((l) => l.id === p.id)
  const qty = basketLines.reduce((sum, line) => sum + line.qty, 0)
  const editableLine = basketLines[0]

  // Sold out: per-size stock all 0, else whole-item capacity 0.
  const sizeStock = sizeStockOf(p.id)
  const soldOut = sizeStock
    ? Object.values(sizeStock).every((q) => q <= 0)
    : capacityOf(p.id) === 0

  const changeQty = (e: React.MouseEvent, nextQty: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!editableLine) return
    setQty(p.id, editableLine.size, nextQty)
  }

  return (
    <Link
      to={`/product/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-surface transition hover:bg-elevated"
    >
      <div className="relative aspect-square overflow-hidden" style={isImageUrl(p.cover) ? undefined : { background: p.cover }}>
        {isImageUrl(p.cover) && <BlurImage src={p.cover} alt={p.title} className="absolute inset-0 h-full w-full" />}
        {p.tag && (
          <span className="absolute left-3 top-3 rounded-[var(--radius-pill)] bg-black/50 px-3 py-1 text-[11px] font-medium backdrop-blur">
            {p.tag}
          </span>
        )}
        {/* <span className="absolute bottom-3 right-3 rounded-[var(--radius-pill)] bg-black/50 px-2 py-1 text-[10px] uppercase tracking-wide text-ink-soft backdrop-blur">
          {p.kind === 'album' ? 'Альбом' : 'Мерчендайз2'}
        </span> */}
        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <span className="rounded-[var(--radius-pill)] bg-black/70 px-4 py-1.5 text-[13px] font-bold text-red-400 backdrop-blur">
              Дууссан
            </span>
          </div>
        )}
        {!soldOut && qty > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex h-11 items-center overflow-hidden rounded-[var(--radius-pill)] bg-black/70 text-white backdrop-blur">
              <button
                type="button"
                onClick={(e) => changeQty(e, editableLine!.qty - 1)}
                className="h-11 w-11 text-[20px] font-medium transition hover:bg-white/10"
                aria-label="Хасах"
              >
                −
              </button>
              <span className="min-w-10 text-center text-[15px] font-bold">{qty}</span>
              <button
                type="button"
                onClick={(e) => changeQty(e, editableLine!.qty + 1)}
                className="h-11 w-11 text-[20px] font-medium transition hover:bg-white/10"
                aria-label="Нэмэх"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="font-bold leading-tight">{p.title}</h3>
        <p className="text-[13px] text-ink-soft">{p.artist}</p>
        <p className="mt-2 text-[15px] font-medium">{formatMNT(p.price)}</p>
      </div>
    </Link>
  )
}
