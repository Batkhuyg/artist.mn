import { Link } from 'react-router-dom'
import { type Album, albumPrice, formatMNT } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import { useCatalog } from '../store/catalog.tsx'
import BlurImage from './BlurImage.tsx'

export default function AlbumCard({ a }: { a: Album }) {
  const { add, lines, setQty } = useBasket()
  const { capacityOf } = useCatalog()
  const stock = capacityOf(a.album_id)
  const line = lines.find((l) => l.id === a.album_id)
  const qty = line?.qty ?? 0

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    add(a.album_id)
  }

  const changeQty = (e: React.MouseEvent, nextQty: number) => {
    e.preventDefault()
    e.stopPropagation()
    setQty(a.album_id, undefined, nextQty)
  }

  return (
    <Link
      to={`/album/${a.album_id}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-md)] bg-surface transition hover:bg-elevated"
    >
      <div className="relative aspect-square overflow-hidden">
        <BlurImage
          src={a.cover_image}
          alt={a.title}
          className="h-full w-full"
          imgClassName="transition group-hover:scale-105"
        />
        {qty > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex h-11 items-center overflow-hidden rounded-[var(--radius-pill)] bg-black/70 text-white backdrop-blur">
              <button
                type="button"
                onClick={(e) => changeQty(e, qty - 1)}
                className="h-11 w-11 text-[20px] font-medium transition hover:bg-white/10"
                aria-label="Хасах"
              >
                −
              </button>
              <span className="min-w-10 text-center text-[15px] font-bold">{qty}</span>
              <button
                type="button"
                onClick={(e) => changeQty(e, qty + 1)}
                className="h-11 w-11 text-[20px] font-medium transition hover:bg-white/10"
                aria-label="Нэмэх"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <h3 className="truncate text-[13px] font-bold leading-tight">{a.title}</h3>
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-soft">{a.release_year}</p>
          {stock === 0 ? (
            <p className="text-[11px] font-medium text-red-400">Дууссан</p>
          ) : stock !== null ? (
            <p className="text-[11px] text-ink-soft">Үлдэгдэл: {stock}</p>
          ) : null}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium">{formatMNT(albumPrice(a))}</p>
          <button
            onClick={onAdd}
            disabled={stock === 0}
            className="rounded-[var(--radius-pill)] bg-accent px-2.5 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Сагсанд нэмэх"
          >
            + Сагс
          </button>
        </div>
      </div>
    </Link>
  )
}
