import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.tsx'
import { callFn } from '../lib/api.ts'
import { fmtDateTime, formatMNT } from '../lib/fmt.ts'
import { STATUS } from '../lib/orderStatus.ts'
import Button from '../components/Button.tsx'

interface OrderItem {
  line_id: string
  kind: string
  title: string
  price: number
  qty: number
  size: string | null
}

interface OrderDetailData {
  id: string
  status: string
  subtotal: number | null
  shipping: number | null
  total_amount: number | null
  customer_name: string | null
  customer_phone: string | null
  address: string | null
  unit: string | null
  note: string | null
  created_at: string
  paid_at: string | null
  item_count: number
  items: OrderItem[]
}

export default function OrderDetail() {
  const { id = '' } = useParams()
  const { customer, isAuthReady } = useAuth()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrder = useCallback(async () => {
    if (!customer) return
    setLoading(true)
    try {
      const data = await callFn<{ orders: OrderDetailData[] }>('get-orders', {
        customer_id: customer.id, order_id: id,
      })
      setOrder(data.orders?.[0] ?? null)
    } catch {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [customer, id])

  useEffect(() => {
    if (!isAuthReady) return
    if (!customer) { navigate('/'); return }
    void fetchOrder()
  }, [isAuthReady, customer, fetchOrder, navigate])

  const recheck = async () => {
    setChecking(true)
    try {
      const data = await callFn<{ success?: boolean }>('qpay-callback', {}, `?order_id=${id}`)
      if (data.success) await fetchOrder()
    } finally {
      setChecking(false)
    }
  }

  const deleteOrder = async () => {
    if (!customer || !order || order.status === 'paid') return
    const ok = window.confirm('Энэ захиалгыг устгах уу?')
    if (!ok) return

    setDeleting(true)
    setError(null)
    try {
      await callFn<{ success: boolean }>('delete-order', {
        order_id: order.id,
        customer_id: customer.id,
      })
      navigate('/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Захиалга устгахад алдаа гарлаа')
    } finally {
      setDeleting(false)
    }
  }

  if (!customer) return null

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/profile" className="inline-block py-6 text-[14px] text-ink-soft hover:text-ink">← Захиалгын түүх</Link>

      {loading ? (
        <div className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-surface" />
      ) : !order ? (
        <div className="py-16 text-center text-ink-muted">
          <p className="text-[14px]">Захиалга олдсонгүй</p>
        </div>
      ) : (() => {
        const st = STATUS[order.status] ?? STATUS.pending
        const subtotal = order.subtotal ?? 0
        const shipping = order.shipping ?? 0
        return (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-[20px] font-bold">Захиалга #{order.id.slice(0, 8)}</h1>
                <p className="mt-1 text-[12px] text-ink-muted">{fmtDateTime(order.created_at)}</p>
                {order.paid_at && (
                  <p className="text-[12px] text-ink-muted">Төлсөн: {fmtDateTime(order.paid_at)}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-[var(--radius-pill)] px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>
                {st.label}
              </span>
            </div>

            {order.status === 'pending' && (
              <Button onClick={recheck} disabled={checking} className="self-start">
                {checking ? 'Шалгаж байна...' : 'Төлбөр шалгах'}
              </Button>
            )}

            {error && (
              <p className="rounded-[var(--radius-md)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-[14px] text-red-400">
                {error}
              </p>
            )}

            <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
              {order.items.map((it, i) => (
                <div
                  key={it.line_id + i}
                  className={`flex items-start justify-between gap-3 p-4 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold">{it.title}{it.size ? ` (${it.size})` : ''}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{formatMNT(it.price)} × {it.qty}</p>
                  </div>
                  <p className="shrink-0 text-[14px] font-semibold">{formatMNT(it.price * it.qty)}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-[13px]">
              <div className="flex justify-between text-ink-soft">
                <span>Дүн ({order.item_count} ширхэг)</span>
                <span>{formatMNT(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-ink-soft">
                <span>Хүргэлт</span>
                <span>{shipping > 0 ? formatMNT(shipping) : 'Үнэгүй'}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-line pt-3 text-[15px] font-bold">
                <span>Нийт</span>
                <span>{formatMNT(order.total_amount ?? subtotal + shipping)}</span>
              </div>
            </div>

            {(order.customer_name || order.address) && (
              <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4">
                <p className="mb-2 text-[13px] font-bold">Хүргэлтийн мэдээлэл</p>
                <div className="flex flex-col gap-1 text-[13px] text-ink-soft">
                  {order.customer_name && <p>{order.customer_name}</p>}
                  {order.customer_phone && <p>{order.customer_phone}</p>}
                  {order.address && <p>{order.address}{order.unit ? `, ${order.unit}` : ''}</p>}
                  {order.note && <p className="text-ink-muted">Тэмдэглэл: {order.note}</p>}
                </div>
              </div>
            )}

            {order.status !== 'paid' && (
              <div className="border-t border-line pt-6">
                <button
                  type="button"
                  onClick={deleteOrder}
                  disabled={deleting}
                  className="w-full rounded-[var(--radius-md)] border border-red-500/40 px-4 py-3 text-[14px] font-bold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  {deleting ? 'Устгаж байна...' : 'Захиалга устгах'}
                </button>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
