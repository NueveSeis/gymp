import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { addDays, todayIso } from '@/lib/dates'
import { countCompleted, getBodyMetrics, getDailyAggregates, getWeightProgress } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { BodyWeightChart, ConsistencyCard, ProgressStats, StrengthCard } from '@/components/progress-sections'
import { BodyMetrics } from './body-metrics'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Mi progreso · ${systemName}` }
}

export default async function ProgressPage() {
  const session = await requirePageUser('client')
  const today = todayIso()
  const [days, completed, strength, metrics] = await Promise.all([
    getDailyAggregates(session.id, addDays(today, -365), addDays(today, 7)),
    countCompleted(session.id),
    getWeightProgress(session.id, addDays(today, -180)),
    getBodyMetrics(session.id),
  ])
  const latestWeight = metrics.find((m) => m.weightKg !== null)?.weightKg ?? null

  return (
    <div className="space-y-4">
      <PageHeader title="Mi progreso" subtitle="Lo que no se mide, no mejora." />
      <ProgressStats days={days} today={today} completed={completed} latestWeight={latestWeight} />
      <ConsistencyCard days={days} today={today} />
      <StrengthCard progress={strength} />
      <section className="card p-4 sm:p-5">
        <h2 className="mb-4 font-semibold">Peso corporal</h2>
        <BodyWeightChart metrics={metrics} />
        <BodyMetrics metrics={metrics} today={today} />
      </section>
    </div>
  )
}
