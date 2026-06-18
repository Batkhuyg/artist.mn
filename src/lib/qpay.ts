// Real QPay flow via Supabase edge functions (create-qpay-invoice / qpay-callback).
import { callFn } from './api.ts'

export interface QPayBankUrl {
  name: string
  description: string
  logo: string
  link: string
}

export interface QPayInvoice {
  invoice_id: string
  qr_text: string
  qr_image?: string // base64 PNG from QPay
  urls: QPayBankUrl[]
}

// Render a scannable QR from text via a public image API (fallback when no qr_image).
export function qrImageUrl(text: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`
}

// Create a QPay invoice for a pending order.
export function createInvoice(orderId: string, customerId: string): Promise<QPayInvoice> {
  return callFn<QPayInvoice>('create-qpay-invoice', { order_id: orderId, customer_id: customerId })
}

// Ask the backend to re-check QPay payment status for this order.
export async function checkPayment(orderId: string): Promise<'paid' | 'pending'> {
  const data = await callFn<{ success?: boolean; already_paid?: boolean }>(
    'qpay-callback',
    {},
    `?order_id=${encodeURIComponent(orderId)}`,
  )
  return data.success ? 'paid' : 'pending'
}
