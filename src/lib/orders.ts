import { callFn } from './api.ts'
import type { BasketLine } from '../store/basket.tsx'

export interface DeliveryInput {
  name: string
  phone: string
  address: string
  unit?: string
  note?: string
}

export interface CreatedOrder {
  order_id: string
  subtotal: number
  shipping: number
  total: number
}

// Create a pending order server-side. Prices are computed by the edge function
// from the catalog tables — the client only sends line ids + quantities.
export async function createOrder(
  customerId: string,
  lines: BasketLine[],
  delivery: DeliveryInput,
): Promise<CreatedOrder> {
  return callFn<CreatedOrder>('create-order', {
    customer_id: customerId,
    lines: lines.map((l) => ({ line_id: l.id, qty: l.qty, size: l.size ?? null })),
    delivery,
  })
}
