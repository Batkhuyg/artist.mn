import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react'
import type { Customer } from '../lib/api.ts'

interface AuthContextType {
  customer: Customer | null
  isAuthReady: boolean
  isLoginOpen: boolean
  openLoginModal: (onSuccess?: () => void) => void
  closeLoginModal: () => void
  login: (customer: Customer) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)
const KEY = 'artist_customer'

function readStored(): Customer | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const c = JSON.parse(raw) as Customer
    // Self-heal: drop a stored customer whose id isn't a real uuid (e.g. stale
    // test data) so it can't be sent to the server as an invalid customer_id.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c?.id ?? '')
    if (!isUuid) {
      window.localStorage.removeItem(KEY)
      return null
    }
    return c
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const callbackRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    setCustomer(readStored())
    setIsAuthReady(true)
  }, [])

  const openLoginModal = (onSuccess?: () => void) => {
    callbackRef.current = onSuccess ?? null
    setIsLoginOpen(true)
  }

  const closeLoginModal = () => {
    setIsLoginOpen(false)
    callbackRef.current = null
  }

  const login = (c: Customer) => {
    setCustomer(c)
    window.localStorage.setItem(KEY, JSON.stringify(c))
    setIsLoginOpen(false)
    callbackRef.current?.()
    callbackRef.current = null
  }

  const logout = () => {
    setCustomer(null)
    window.localStorage.removeItem(KEY)
  }

  return (
    <AuthContext.Provider value={{ customer, isAuthReady, isLoginOpen, openLoginModal, closeLoginModal, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
