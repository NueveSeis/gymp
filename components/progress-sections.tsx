// Secciones de progreso compartidas entre la vista del cliente y la ficha del entrenador
import { CalendarCheck2, Flame, Percent, Scale, Trophy } from 'lucide-react'
import { Heatmap, LineChart, Sparkline } from './charts'
import { EmptyState, StatCard } from './ui/basics'
import { addDays } from '@/lib/dates'
import { completionRate, computeStreak, heatmapCells, type DayAgg } from '@/lib/stats'
import type { BodyMetricRow, WeightProgress } from '@/lib/queries'

export function ProgressStats({ days, today, completed, latestWeight }: { days: DayAgg[]; today: string; completed: number; latestWeight: number | null }) {
  const streak = computeStreak(days, today)
  const rate30 = completionRate(days, addDays(today, -29), today)
  const rate7 = completionRate(days, addDays(today, -6), today)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={Flame} tone="yellow" label="Racha (días)" value={streak} hint={streak > 0 ? '¡Sigue así!' : 'Completa tu próxima rutina'} />
      <StatCard icon={Percent} tone="blue" label="Cumplimiento 30 días" value={rate30 === null ? '—' : `${rate30}%`} hint={rate7 === null ? undefined : `Últimos 7 días: ${rate7}%`} />
      <StatCard icon={CalendarCheck2} tone="green" label="Ejercicios hechos" value={completed} />
      <StatCard icon={Scale} tone="cyan" label="Peso corporal" value={latestWeight === null ? '—' : `${latestWeight} kg`} />
    </div>
  )
}

export function ConsistencyCard({ days, today }: { days: DayAgg[]; today: string }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-1 font-semibold">Constancia</h2>
      <p className="mb-4 text-sm text-muted">Últimas 18 semanas. Cada cuadro es un día.</p>
      <Heatmap cells={heatmapCells(days, today)} />
    </section>
  )
}

export function StrengthCard({ progress }: { progress: WeightProgress[] }) {
  return (
    <section className="card p-4 sm:p-5">
      <h2 className="mb-1 font-semibold">Fuerza</h2>
      <p className="mb-4 text-sm text-muted">Peso máximo registrado por ejercicio (últimos 6 meses).</p>
      {progress.length === 0 ? (
        <p className="rounded-lg bg-surface-2 px-4 py-6 text-center text-sm text-muted">
          Aún no hay pesos registrados. Usa “Registrar peso” en cada ejercicio.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {progress.map((p) => {
            const delta = Math.round((p.last - p.first) * 10) / 10
            return (
              <li key={p.exerciseId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <Trophy className="size-3.5 text-warn" /> {p.best} kg
                    {p.points.length > 1 && (
                      <span className={delta > 0 ? 'text-ok-fg' : delta < 0 ? 'text-danger-fg' : ''}>
                        {delta > 0 ? '+' : ''}
                        {delta} kg
                      </span>
                    )}
                  </p>
                </div>
                <Sparkline points={p.points} />
                <span className="w-16 text-right font-bold tabular-nums">{p.last} kg</span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function BodyWeightChart({ metrics }: { metrics: BodyMetricRow[] }) {
  const points = metrics
    .filter((m) => m.weightKg !== null)
    .map((m) => ({ date: String(m.measuredOn), value: m.weightKg as number }))
    .reverse()
  if (points.length === 0) {
    return <EmptyState icon={Scale} title="Sin medidas todavía">Registra tu peso para ver tu evolución.</EmptyState>
  }
  const first = points[0].value
  const last = points[points.length - 1].value
  const delta = Math.round((last - first) * 10) / 10
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums">{last} kg</span>
        {points.length > 1 && (
          <span className="text-sm text-muted">
            {delta > 0 ? '+' : ''}
            {delta} kg desde el inicio
          </span>
        )}
      </div>
      <LineChart points={points} unit="kg" />
    </div>
  )
}
