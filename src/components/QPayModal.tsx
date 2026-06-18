import { useEffect, useState } from 'react'
import { type QPayInvoice, type QPayBankUrl, qrImageUrl, checkPayment } from '../lib/qpay.ts'
import { formatMNT } from '../data/catalog.ts'

// Preferred bank ordering (most common first), mirrors shots.mn.
const BANK_SORT = [
  'Khan bank', 'Social Pay', 'Trade and Development bank', 'Xac bank',
  'State bank 3.0', 'M bank', 'Toki App', 'Capitron bank', 'Monpay',
  'Bogd bank', 'Arig bank', 'Ard App',
]

function sortedUrls(urls: QPayBankUrl[]) {
  return [...urls].sort((a, b) => {
    const ai = BANK_SORT.indexOf(a.name)
    const bi = BANK_SORT.indexOf(b.name)
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default function QPayModal({
  invoice,
  orderId,
  amount,
  loading,
  onPaid,
  onClose,
}: {
  invoice: QPayInvoice | null
  orderId: string | null
  amount: number
  loading: boolean
  onPaid: () => void
  onClose: () => void
}) {
  const [checking, setChecking] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState('')

  // lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const onCheck = async () => {
    if (!orderId) return
    setChecking(true)
    setError('')
    try {
      const status = await checkPayment(orderId)
      if (status === 'paid') onPaid()
      else setError('Төлбөр хараахан төлөгдөөгүй байна. Дахин шалгана уу.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Шалгахад алдаа гарлаа')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-[400px] flex-col overflow-hidden rounded-t-[var(--radius-lg)] border border-line bg-surface sm:rounded-[var(--radius-lg)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <p className="text-[16px] font-bold">QPay төлбөр</p>
          <button onClick={onClose} className="text-[20px] leading-none text-ink-soft hover:text-ink" aria-label="Хаах">✕</button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] text-ink-soft">Төлөх дүн</span>
            <span className="text-[20px] font-bold">{formatMNT(amount)}</span>
          </div>

          {loading || !invoice ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
              <p className="text-[13px] text-ink-soft">QR код үүсгэж байна...</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2">
                <div className="overflow-hidden rounded-[var(--radius-md)] bg-white p-3">
                  <img
                    src={invoice.qr_image ? `data:image/png;base64,${invoice.qr_image}` : qrImageUrl(invoice.qr_text)}
                    alt="QPay QR"
                    width={200}
                    height={200}
                    className="h-[200px] w-[200px]"
                  />
                </div>
                <p className="text-[13px] text-ink-soft">Банкны аппаараа QR уншуулна уу</p>
              </div>

              {invoice.urls.length > 0 && (() => {
                const sorted = sortedUrls(invoice.urls)
                const visible = showAll ? sorted : sorted.slice(0, 6)
                const hasMore = sorted.length > 6
                return (
                  <div>
                    <p className="mb-2 text-[13px] text-ink-soft">Эсвэл банкны аппаа нээх:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {visible.map((b) => (
                        <a
                          key={b.name}
                          href={b.link}
                          className="flex items-center gap-2 overflow-hidden rounded-[var(--radius-sm)] border border-line bg-bg px-3 py-2 text-[13px] hover:border-accent"
                        >
                          {b.logo ? (
                            <img src={b.logo} alt={b.description} className="h-5 w-5 shrink-0 rounded" />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent text-[11px] font-bold text-white">
                              {b.name.charAt(0)}
                            </span>
                          )}
                          <span className="truncate">{b.description}</span>
                        </a>
                      ))}
                    </div>
                    {hasMore && (
                      <button
                        onClick={() => setShowAll((v) => !v)}
                        className="mt-2 w-full rounded-[var(--radius-sm)] border border-line py-2 text-[12px] text-ink-soft hover:text-ink"
                      >
                        {showAll ? 'Хураах ↑' : `бусад банкууд (${sorted.length - 6}) ↓`}
                      </button>
                    )}
                  </div>
                )
              })()}

              {error && <p className="text-[13px] text-danger">{error}</p>}

              <button
                onClick={onCheck}
                disabled={checking}
                className="mt-1 w-full rounded-[var(--radius-pill)] bg-ink py-3 text-[14px] font-medium text-bg transition hover:bg-white/90 disabled:opacity-50"
              >
                {checking ? 'Шалгаж байна...' : 'Төлбөр шалгах'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
