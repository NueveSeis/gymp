// Cálculos puros sobre agregados diarios (sin acceso a la base)
import { addDays, diffDays } from './dates'

export type DayAgg = { date: string; total: number; done: number }

/** Días consecutivos con la rutina completa. Los días sin rutina (descanso) no rompen la racha. */
export function computeStreak(days: DayAgg[], today: string): number {
  const sorted = days.filter((d) => d.date <= today && d.total > 0).sort((a, b) => (a.date < b.date ? 1 : -1))
  let streak = 0
  for (const d of sorted) {
    const complete = d.done >= d.total
    if (d.date === today && !complete) continue // hoy todavía está en curso
    if (!complete) break
    streak++
  }
  return streak
}

export function completionRate(days: DayAgg[], from: string, to: string): number | null {
  let total = 0
  let done = 0
  for (const d of days) {
    if (d.date >= from && d.date <= to) {
      total += d.total
      done += d.done
    }
  }
  return total === 0 ? null : Math.round((done / total) * 100)
}

/** Celdas del mapa de constancia (semanas completas terminando en la semana de hoy) */
export function heatmapCells(days: DayAgg[], today: string, weeks = 18) {
  const map = new Map(days.map((d) => [d.date, d]))
  const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const start = addDays(today, -dow - (weeks - 1) * 7)
  const cells: { date: string; level: 0 | 1 | 2 | 3 | 4; total: number; done: number; future: boolean }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const date = addDays(start, i)
    const d = map.get(date)
    const future = diffDays(date, today) > 0
    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (d && d.total > 0) {
      const ratio = d.done / d.total
      level = ratio === 0 ? 1 : ratio < 0.5 ? 2 : ratio < 1 ? 3 : 4
    }
    cells.push({ date, level, total: d?.total ?? 0, done: d?.done ?? 0, future })
  }
  return cells
}
