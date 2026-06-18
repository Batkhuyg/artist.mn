import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { formatMNT } from '../data/catalog.ts'
import { useBasket } from '../store/basket.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'
import Button from '../components/Button.tsx'
import QPayModal from '../components/QPayModal.tsx'
import { createInvoice, type QPayInvoice } from '../lib/qpay.ts'
import { createOrder } from '../lib/orders.ts'

function Field({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <input
        {...rest}
        className="min-h-[48px] rounded-[var(--radius-md)] border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:border-accent"
      />
    </label>
  )
}

function TextArea({ label, ...rest }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <textarea
        {...rest}
        className="resize-none rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:border-accent"
      />
    </label>
  )
}

export default function Checkout() {
  const { lines, subtotal, clear, meta } = useBasket()
  const { customer, openLoginModal } = useAuth()
  const [done, setDone] = useState(false)
  const shipping = 10000
  const total = subtotal + shipping

  // Delivery form fields
  const [form, setForm] = useState({ phone: '', address: '', unit: '', note: '' })
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Prefill phone once we know the logged-in customer
  useEffect(() => {
    if (customer?.phone) setForm((f) => (f.phone ? f : { ...f, phone: customer.phone! }))
  }, [customer])

  // QPay payment flow
  const [payOpen, setPayOpen] = useState(false)
  const [invoice, setInvoice] = useState<QPayInvoice | null>(null)
  const [invoiceLoading, setInvoiceLoading] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)

  if (done) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[var(--radius-pill)] bg-accent text-[28px]">✓</div>
        <h1 className="text-[26px] font-bold">Захиалга баталгаажлаа</h1>
        <p className="mt-2 text-ink-soft">Төлбөр амжилттай. Бид тун удахгүй тантай холбогдоно.</p>
        {orderId && <p className="mt-1 text-[13px] text-ink-muted">Захиалгын дугаар: {orderId.slice(0, 8)}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/profile"><Button>Миний захиалгууд</Button></Link>
          <Link to="/"><Button variant="ghost">Нүүр хуудас</Button></Link>
        </div>
      </div>
    )
  }

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-ink-soft">Сагс хоосон байна.</p>
        <Link to="/" className="mt-4 inline-block"><Button variant="ghost">Дэлгүүр</Button></Link>
      </div>
    )
  }

  // Create the order server-side, then open the QPay invoice modal.
  const startCheckout = async () => {
    if (!customer) return
    setSubmitting(true)
    setError(null)
    try {
      const order = await createOrder(customer.id, lines, {
        name: customer.phone ?? customer.email ?? 'Хэрэглэгч',
        phone: form.phone,
        address: form.address,
        unit: form.unit || undefined,
        note: form.note || undefined,
      })
      setOrderId(order.order_id)
      setPayOpen(true)
      setInvoiceLoading(true)
      const inv = await createInvoice(order.order_id, customer.id)
      setInvoice(inv)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа')
      setPayOpen(false)
    } finally {
      setInvoiceLoading(false)
      setSubmitting(false)
    }
  }

  // Toggle online payment. Off → show "coming soon" warning instead of charging.
  const PAYMENT_ENABLED = false

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!PAYMENT_ENABLED) {
      setComingSoon(true)
      return
    }
    if (!customer) {
      openLoginModal(() => { void startCheckout() })
      return
    }
    void startCheckout()
  }

  // QPay confirmed paid → finalize UI (order already marked paid server-side).
  const onPaid = () => {
    setPayOpen(false)
    clear()
    setDone(true)
    window.scrollTo(0, 0)
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3 text-[14px] text-ink-soft">
        <Link to="/basket" className="hover:text-ink">Сагс</Link>
        <span>/</span>
        <span className="text-ink">Төлбөр</span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={submit} className="flex flex-col gap-8">
          <section>
            <h2 className="mb-4 text-[18px] font-bold">Хүргэлтийн мэдээлэл</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Утас" required type="tel" placeholder="8800XXXX" value={form.phone} onChange={set('phone')} />
              <Field label="Хаяг" required placeholder="Дүүрэг, хороо, байр" value={form.address} onChange={set('address')} />
              <Field label="Орц / тоот" placeholder="2 орц, 14 тоот" value={form.unit} onChange={set('unit')} />
              <TextArea
                label="Нэмэлт тайлбар"
                rows={3}
                placeholder="Хүргэлттэй холбоотой нэмэлт мэдээлэл..."
                className="sm:col-span-2"
                value={form.note}
                onChange={set('note')}
              />
            </div>
          </section>

          {error && (
            <p className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Уншиж байна...' : 'Төлбөр төлөх'}
          </Button>
          {comingSoon && (
            <p className="rounded-[var(--radius-md)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center text-[14px] text-amber-400">
              Онлайн төлбөрийн систем тун удахгүй нэвтэрнэ. Түр хүлээнэ үү.
            </p>
          )}
        </form>

        {payOpen && (
          <QPayModal
            invoice={invoice}
            orderId={orderId}
            amount={total}
            loading={invoiceLoading}
            onPaid={onPaid}
            onClose={() => setPayOpen(false)}
          />
        )}

        <aside className="h-fit rounded-[var(--radius-lg)] bg-surface p-6">
          <h2 className="text-[18px] font-bold">Захиалга</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {lines.map((l) => {
              const m = meta(l.id)
              if (!m) return null
              return (
                <li key={l.id + (l.size ?? '')} className="flex justify-between gap-3 text-[14px]">
                  <span className="text-ink-soft">
                    {m.title}{l.size ? ` (${l.size})` : ''} × {l.qty}
                  </span>
                  <span>{formatMNT(m.price * l.qty)}</span>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between"><span className="text-ink-soft">Хүргэлт</span><span>{formatMNT(shipping)}</span></div>
            <div className="flex justify-between text-[16px] font-bold"><span>Нийт</span><span>{formatMNT(subtotal + shipping)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  )
}
