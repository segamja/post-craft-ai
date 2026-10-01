const rtf = new Intl.RelativeTimeFormat('ko', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "3분 전", "어제", "2주 전" */
export function formatRelative(iso: string, now = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000)
  for (const [unit, sec] of UNITS) {
    if (Math.abs(diffSec) >= sec) return rtf.format(Math.trunc(diffSec / sec), unit)
  }
  return '방금 전'
}
