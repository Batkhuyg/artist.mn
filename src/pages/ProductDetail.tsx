import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { formatMNT, isImageUrl } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import { useCatalog } from '../store/catalog.tsx'
import Button from '../components/Button.tsx'
import ProductCard from '../components/ProductCard.tsx'
import BlurImage from '../components/BlurImage.tsx'

export default function ProductDetail() {
  const { id = '' } = useParams()
  const { findProduct, products, capacityOf, sizeStockOf, ready } = useCatalog()
  const p = findProduct(id)
  const { add } = useBasket()
  const stock = p ? capacityOf(p.id) : null
  const sizeStock = p ? sizeStockOf(p.id) : null
  const nav = useNavigate()
  const [size, setSize] = useState<string | undefined>(undefined)
  const [added, setAdded] = useState(false)
  const [stockMsg, setStockMsg] = useState<string | null>(null)

  if (!p) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-soft">{ready ? 'Мерчендайз олдсонгүй.' : 'Уншиж байна...'}</p>
        {ready && <Link to="/" className="mt-4 inline-block"><Button variant="ghost">Нүүр</Button></Link>}
      </div>
    )
  }

  // Sizes come from DB stock when set, else static product data.
  const sizes = sizeStock ? Object.keys(sizeStock) : p.sizes ?? []
  const needsSize = sizes.length > 0
  const soldOut = sizeStock
    ? Object.values(sizeStock).every((q) => q <= 0)
    : stock === 0
  const sizeRemaining = size && sizeStock ? sizeStock[size] : null
  const canAdd = needsSize
    ? !!size && (sizeRemaining === null || sizeRemaining > 0)
    : !soldOut

  const onAdd = async (go?: boolean) => {
    if (!canAdd) return
    const res = await add(p.id, size, 1)
    if (!res.ok) {
      setStockMsg(res.available === 0 ? 'Дууссан.' : `Үлдэгдэл хүрэлцэхгүй (${res.available} ширхэг).`)
      return
    }
    setStockMsg(null)
    if (go) nav('/basket')
    else { setAdded(true); setTimeout(() => setAdded(false), 1500) }
  }

  const related = products.filter((x) => x.kind === p.kind && x.id !== p.id).slice(0, 4)

  return (
    <div className="flex flex-col gap-16">
      <Link to="/" className="text-[14px] text-ink-soft hover:text-ink">← Буцах</Link>

      <div className="grid gap-8 md:grid-cols-2">
        {isImageUrl(p.cover) ? (
          <BlurImage src={p.cover} alt={p.title} className="aspect-square w-full rounded-[var(--radius-lg)]" />
        ) : (
          <div className="aspect-square rounded-[var(--radius-lg)]" style={{ background: p.cover }} />
        )}

        <div className="flex flex-col">
          <span className="text-[12px] uppercase tracking-wide text-ink-soft">
            {p.kind === 'album' ? 'Альбом' : 'Мерчендайз'} · {p.artist}
          </span>
          <h1 className="mt-2 text-[32px] font-bold leading-tight">{p.title}</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{p.desc}</p>
          <p className="mt-6 text-[24px] font-bold">{formatMNT(p.price)}</p>
          {soldOut ? (
            <p className="mt-2 text-[14px] font-medium text-red-400">Дууссан</p>
          ) : !needsSize && stock !== null ? (
            <p className="mt-2 text-[14px] text-ink-soft">Үлдэгдэл: {stock}</p>
          ) : null}

          {needsSize && (
            <div className="mt-6">
              <p className="mb-2 text-[14px] text-ink-soft">Хэмжээ сонгох</p>
              <div className="flex flex-wrap gap-3">
                {sizes.map((s) => {
                  const sQty = sizeStock ? sizeStock[s] : null
                  const sSoldOut = sQty === 0
                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => setSize(s)}
                        disabled={sSoldOut}
                        className={`min-h-[44px] min-w-[52px] rounded-[var(--radius-sm)] px-3 text-[14px] transition ${size === s ? 'bg-ink text-bg' : 'bg-surface text-ink hover:bg-elevated'
                          } ${sSoldOut ? 'cursor-not-allowed line-through opacity-40' : ''}`}
                      >
                        {s}
                      </button>
                      {sQty !== null && (
                        <span
                          title="Үлдэгдэл"
                          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white"
                        >
                          {sQty}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => onAdd(false)} disabled={!canAdd}>
              {soldOut ? 'Дууссан' : added ? '✓ Нэмэгдлээ' : 'Сагсанд нэмэх'}
            </Button>
            <Button variant="ghost" onClick={() => onAdd(true)} disabled={!canAdd}>
              Шууд авах
            </Button>
          </div>
          {needsSize && !size && (
            <p className="mt-3 text-[13px] text-ink-muted">Эхлээд хэмжээгээ сонгоно уу.</p>
          )}
          {stockMsg && (
            <p className="mt-3 text-[13px] text-red-400">{stockMsg}</p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="mb-5 text-[22px] font-bold">Төстэй</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </div>
  )
}
