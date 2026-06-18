import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useBasket } from '../store/basket.tsx'
import { useAuth } from '../contexts/AuthContext.tsx'

const nav: [string, string][] = [
  ['Альбом', '/#albums'],
  ['Мерчендайз', '/#merch'],
  ['Уран бүтээлч', '/#artists'],
]

function AuthButton() {
  const { customer, openLoginModal, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!customer) {
    return (
      <button
        onClick={() => openLoginModal()}
        className="rounded-[var(--radius-pill)] border border-line bg-surface px-4 py-2 text-[13px] font-medium text-ink hover:bg-elevated"
      >
        Нэвтрэх
      </button>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-surface py-1.5 pl-2 pr-3 text-[13px] font-medium text-ink hover:bg-elevated"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] bg-accent text-white">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="max-w-[90px] truncate">{customer.phone ?? customer.email}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] min-w-[160px] overflow-hidden rounded-[var(--radius-md)] border border-line bg-bg shadow-lg">
          <button
            onClick={() => { setOpen(false); navigate('/profile') }}
            className="block w-full border-b border-line px-4 py-2.5 text-left text-[13px] text-ink hover:bg-surface"
          >
            Захиалгууд
          </button>
          <button
            onClick={() => { logout(); setOpen(false) }}
            className="block w-full px-4 py-2.5 text-left text-[13px] text-red-400 hover:bg-surface"
          >
            Гарах
          </button>
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const { count } = useBasket()
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 md:h-16 md:px-6">
        <Link to="/" className="text-[16px] font-bold tracking-tight md:text-[18px]">
          ARTIST<span className="text-accent">.</span>MN
        </Link>

        <nav className="hidden gap-6 text-[14px] text-ink-soft md:flex">
          {nav.map(([label, href]) => (
            <a key={label} href={href} className="hover:text-ink">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <AuthButton />
          <NavLink
            to="/basket"
            className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-surface hover:bg-elevated md:h-11 md:w-11"
            aria-label="Сагс"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-[var(--radius-pill)] bg-accent px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </NavLink>
        </div>
      </div>

      {/* mobile nav — horizontal scroll */}
      <nav className="flex gap-5 overflow-x-auto border-t border-line px-4 py-2 text-[13px] text-ink-soft md:hidden">
        {nav.map(([label, href]) => (
          <a key={label} href={href} className="shrink-0 hover:text-ink">
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
