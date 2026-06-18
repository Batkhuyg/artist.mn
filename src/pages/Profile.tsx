import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

interface Order {
  id: string
  status: 'pending' | 'paid' | 'processing' | 'processed' | 'cancelled'
  total_amount: number | null
  created_at: string
  paid_at: string | null
  item_count: number
  items: OrderItem[]
}

type Filter = 'all' | 'pending' | 'paid' | 'processing' | 'processed' | 'cancelled'
type StatusCounts = Record<Filter, number>

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Бүгд' },
  { key: 'pending', label: 'Хүлээгдэж буй' },
  { key: 'paid', label: 'Төлөгдсөн' },
  { key: 'processing', label: 'Бэлтгэж буй' },
  { key: 'processed', label: 'Хүргэгдсэн' },
  { key: 'cancelled', label: 'Цуцлагдсан' },
]

const EMPTY_COUNTS: StatusCounts = { all: 0, pending: 0, paid: 0, processing: 0, processed: 0, cancelled: 0 }

export default function Profile() {
  const { customer, isAuthReady, logout } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState<Filter>('all')
  const [counts, setCounts] = useState<StatusCounts>(EMPTY_COUNTS)
  const [checkingId, setCheckingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!customer) return
    setLoading(true)
    try {
      const data = await callFn<{
        orders: Order[]
        status_counts: StatusCounts
        pagination: { total_pages: number }
      }>('get-orders', { customer_id: customer.id, page, limit: 5, status: filter })
      setOrders(data.orders ?? [])
      setTotalPages(Math.max(data.pagination?.total_pages ?? 1, 1))
      setCounts({ ...EMPTY_COUNTS, ...data.status_counts })
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [customer, page, filter])

  useEffect(() => {
    if (!isAuthReady) return
    if (!customer) { navigate('/'); return }
    void fetchOrders()
  }, [isAuthReady, customer, fetchOrders, navigate])

  const recheck = async (orderId: string) => {
    setCheckingId(orderId)
    try {
      const data = await callFn<{ success?: boolean }>('qpay-callback', {}, `?order_id=${orderId}`)
      if (data.success) await fetchOrders()
    } finally {
      setCheckingId(null)
    }
  }

  if (!customer) return null

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-pill)] bg-accent text-white">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-[18px] font-bold">{customer.phone ?? customer.email}</p>
            <p className="text-[12px] text-ink-muted">{fmtDateTime(customer.created_at)} бүртгүүлсэн</p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => { logout(); navigate('/') }}>Гарах</Button>
      </div>

      <div className="border-t border-line" />

      <h2 className="mb-4 mt-6 text-[18px] font-bold">Захиалгын түүх</h2>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0).map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(1) }}
            className={`shrink-0 rounded-[var(--radius-pill)] border px-3 py-1.5 text-[12px] font-semibold ${filter === f.key ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink-soft'
              }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-surface" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-ink-muted">
          <p className="text-[14px]">Захиалга байхгүй байна</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => {
            const st = STATUS[order.status] ?? STATUS.pending
            return (
              <Link
                key={order.id}
                to={`/order/${order.id}`}
                className="block rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition hover:border-ink-muted"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold">
                      {order.items.map((it) => `${it.title}${it.size ? ` (${it.size})` : ''} ×${it.qty}`).join(', ')}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-muted">{fmtDateTime(order.created_at)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-[12px] text-ink-soft">
                        {order.item_count} ширхэг • {formatMNT(order.total_amount ?? 0)}
                      </span>
                    </div>
                  </div>
                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => { e.preventDefault(); recheck(order.id) }}
                      disabled={checkingId === order.id}
                      className="shrink-0 rounded-[var(--radius-md)] bg-accent px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-50"
                    >
                      {checkingId === order.id ? '...' : 'Төлбөр шалгах'}
                    </button>
                  )}
                </div>
              </Link>
            )
          })}

          {totalPages > 1 && (
            <div className="mt-2 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>Өмнөх</Button>
              <span className="text-[13px] text-ink-soft">Хуудас {page} / {totalPages}</span>
              <Button variant="ghost" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}>Дараах</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
