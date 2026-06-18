import { Link } from 'react-router-dom'
import { formatMNT, isImageUrl } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import Button from '../components/Button.tsx'
import BlurImage from '../components/BlurImage.tsx'

export default function Basket() {
  const { lines, subtotal, setQty, remove, meta } = useBasket()

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-[24px] font-bold">Сагс хоосон</h1>
        <p className="mt-2 text-ink-soft">Альбом эсвэл Мерчендайз нэмээрэй.</p>
        <Link to="/" className="mt-6 inline-block"><Button>Дэлгүүр рүү</Button></Link>
      </div>
    )
  }

  const shipping = 10000

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-[28px] font-bold">Сагс</h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="flex flex-col divide-y divide-line">
          {lines.map((l) => {
            const m = meta(l.id)
            if (!m) return null
            return (
              <li key={l.id + (l.size ?? '')} className="flex gap-4 py-5">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
                  {m.image ? (
                    <BlurImage src={m.image} alt={m.title} className="h-full w-full" />
                  ) : isImageUrl(m.cover) ? (
                    <BlurImage src={m.cover!} alt={m.title} className="h-full w-full" />
                  ) : (
                    <div className="h-full w-full" style={{ background: m.cover }} />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-3">
                    <div>
                      {m.kind === 'product' ? (
                        <Link to={`/product/${l.id}`} className="font-bold hover:text-accent">{m.title}</Link>
                      ) : (
                        <span className="font-bold">{m.title}</span>
                      )}
                      <p className="text-[13px] text-ink-soft">
                        {m.subtitle}{l.size ? ` · ${l.size}` : ''}
                      </p>
                    </div>
                    <p className="font-medium">{formatMNT(m.price * l.qty)}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-[var(--radius-pill)] bg-surface">
                      <button onClick={() => setQty(l.id, l.size, l.qty - 1)}
                        className="h-9 w-9 text-[18px] text-ink-soft hover:text-ink" aria-label="Хасах">−</button>
                      <span className="w-8 text-center text-[14px]">{l.qty}</span>
                      <button onClick={() => setQty(l.id, l.size, l.qty + 1)}
                        className="h-9 w-9 text-[18px] text-ink-soft hover:text-ink" aria-label="Нэмэх">+</button>
                    </div>
                    <button onClick={() => remove(l.id, l.size)}
                      className="text-[13px] text-danger hover:underline">Устгах</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="h-fit rounded-[var(--radius-lg)] bg-surface p-6">
          <h2 className="text-[18px] font-bold">Дүн</h2>
          <dl className="mt-4 flex flex-col gap-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-ink-soft">Захиалгын дүн</dt><dd>{formatMNT(subtotal)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Хүргэлт</dt>
              <dd>{formatMNT(shipping)}</dd>
            </div>
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-[16px] font-bold">
              <dt>Нийт</dt><dd>{formatMNT(subtotal + shipping)}</dd>
            </div>
          </dl>
          <Link to="/checkout" className="mt-6 block"><Button className="w-full">Захилга үүсгэх</Button></Link>
          <Link to="/" className="mt-3 block text-center text-[13px] text-ink-soft hover:text-ink">Үргэлжлүүлэн худалдан авах</Link>
        </aside>
      </div>
    </div>
  )
}
