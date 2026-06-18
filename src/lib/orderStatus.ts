export type OrderStatus = 'pending' | 'paid' | 'processing' | 'processed' | 'cancelled'

export const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Төлбөр хүлээгдэж буй', cls: 'bg-amber-500/10 text-amber-400' },
  paid: { label: 'Төлөгдсөн', cls: 'bg-violet-500/10 text-violet-400' },
  processing: { label: 'Бэлтгэж буй', cls: 'bg-blue-500/10 text-blue-400' },
  processed: { label: 'Хүргэгдсэн', cls: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Цуцлагдсан', cls: 'bg-gray-500/10 text-gray-400' },
}
