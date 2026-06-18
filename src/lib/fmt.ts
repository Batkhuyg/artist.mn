const TZ = 'Asia/Ulaanbaatar'

export function fmtDateTime(dateStr: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(dateStr))
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? ''
  const hour = p('hour') === '24' ? '00' : p('hour')
  return `${p('year')}.${p('month')}.${p('day')} ${hour}:${p('minute')}`
}

export const formatMNT = (n: number) =>
  new Intl.NumberFormat('mn-MN').format(n) + '₮'
