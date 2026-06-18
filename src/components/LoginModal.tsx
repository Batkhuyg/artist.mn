import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.tsx'
import { callFn, type Customer } from '../lib/api.ts'

// Phone-only login. No SMS/OTP — entering a valid 8-digit number logs in
// directly (send-otp upserts the customer and returns it).
export default function LoginModal() {
  const { isLoginOpen, closeLoginModal, login } = useAuth()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isLoginOpen) return null

  const close = () => {
    closeLoginModal()
    setPhone('')
    setError('')
  }

  const canSend = phone.trim().length >= 8 && !loading

  const submit = async () => {
    const digits = phone.replace(/\D/g, '').slice(0, 8)
    setLoading(true)
    setError('')
    try {
      const data = await callFn<{ customer: Customer }>('send-otp', { phone: digits })
      login(data.customer)
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Алдаа гарлаа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onClick={close}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-[var(--radius-lg)] border border-line bg-bg p-7"
      >
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-[20px] font-bold text-ink">Нэвтрэх</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Утасны дугаараа оруулна уу</p>
          </div>
          <button
            onClick={close}
            aria-label="Хаах"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-pill)] border border-line bg-surface text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        <label className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Утасны дугаар</label>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="9900****"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
          onKeyDown={(e) => e.key === 'Enter' && canSend && submit()}
          autoFocus
          className="min-h-[48px] w-full rounded-[var(--radius-md)] border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-muted focus:border-accent"
        />

        {error && (
          <p className="mt-3 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={!canSend}
          className="mt-4 min-h-[48px] w-full rounded-[var(--radius-pill)] bg-accent text-[14px] font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
        </button>

        <p className="mt-5 text-center text-[11px] text-ink-muted">
          Нэвтэрснээр үйлчилгээний нөхцлийг зөвшөөрч байна
        </p>
      </div>
    </div>
  )
}
