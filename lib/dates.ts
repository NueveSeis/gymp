// Fechas de calendario como strings 'YYYY-MM-DD'. Toda la aritmética se hace
// en UTC para que el resultado no dependa de la zona horaria del servidor.

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/Mexico_City'
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value)
}

/** Fecha de hoy en la zona horaria del gimnasio */
export function todayIso(timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date()
  )
}

function toUtc(iso: string) {
  return new Date(`${iso}T00:00:00Z`)
}

export function addDays(iso: string, days: number): string {
  const d = toUtc(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Lunes de la semana de `iso` */
export function startOfWeek(iso: string): string {
  const dow = (toUtc(iso).getUTCDay() + 6) % 7 // 0 = lunes
  return addDays(iso, -dow)
}

export function weekDays(iso: string): string[] {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(a).getTime() - toUtc(b).getTime()) / 86_400_000)
}

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function fmt(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options)
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat('es-MX', { timeZone: 'UTC', ...options })
    fmtCache.set(key, f)
  }
  return f
}

/** "martes, 27 de octubre" → "Martes, 27 de octubre" (sin poner "De" en mayúscula) */
export const capFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatDate = {
  long: (iso: string) => capFirst(fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(toUtc(iso))),
  full: (iso: string) => capFirst(fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toUtc(iso))),
  short: (iso: string) => fmt({ day: 'numeric', month: 'short' }).format(toUtc(iso)),
  medium: (iso: string) => fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(toUtc(iso)),
  weekday: (iso: string) => fmt({ weekday: 'short' }).format(toUtc(iso)).replace('.', ''),
  dayNum: (iso: string) => String(toUtc(iso).getUTCDate()),
  month: (iso: string) => capFirst(fmt({ month: 'long', year: 'numeric' }).format(toUtc(iso))),
}

export function relativeTime(date: Date | null | undefined): string {
  if (!date) return 'Nunca'
  const diff = (Date.now() - date.getTime()) / 1000
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return rtf.format(-Math.round(diff / 60), 'minute')
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour')
  if (diff < 86400 * 30) return rtf.format(-Math.round(diff / 86400), 'day')
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
