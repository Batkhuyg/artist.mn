import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none'

const sizes = 'min-h-[48px] px-6 text-[16px] rounded-[var(--radius-pill)]'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bg hover:bg-white/90',
  ghost: 'bg-elevated text-ink hover:bg-white/10',
  danger: 'bg-transparent text-danger hover:bg-danger/10',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

export default function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
