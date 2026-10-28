import type { Metadata } from 'next'
import Link from 'next/link'
import { Activity, CalendarClock, CalendarDays, Dumbbell, Percent, Plus, UserRoundX, Users } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { addDays, formatDate, relativeTime, todayIso } from '@/lib/dates'
import { getTrainerOverview } from '@/lib/queries'
import { Avatar, EmptyState, PageHeader, ProgressBar, StatCard } from '@/components/ui/basics'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Resumen · ${systemName}` }
}

export default async function TrainerOverviewPage() {
  const session = await requirePageUser('staff')
  const today = todayIso()
  const data = await getTrainerOverview(today, addDays(today, -6))
  const doneToday = data.today.filter((c) => c.done >= c.total).length

  return (
    <>
      <PageHeader
        title={`Hola, ${session.name.split(' ')[0]} 👋`}
        subtitle={formatDate.full(today)}
        actions={
          <Link href="/trainer/rutinas/nueva" className="btn btn-primary">
            <Plus className="size-4" /> Asignar rutina
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Clientes activos" value={data.clients} />
        <StatCard icon={CalendarDays} tone="cyan" label="Entrenan hoy" value={data.today.length} hint={data.today.length ? `${doneToday} ya terminaron` : undefined} />
        <StatCard
          icon={Percent}
          tone="green"
          label="Cumplimiento 7 días"
          value={data.weekRate === null ? '—' : `${data.weekRate}%`}
          hint={data.weekTotal ? `${data.weekTotal} ejercicios asignados` : undefined}
        />
        <StatCard icon={Dumbbell} tone="yellow" label="Ejercicios en biblioteca" value={data.exercises} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="card p-4 sm:p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Entrenamientos de hoy</h2>
            <Link href={`/trainer/rutinas?date=${today}`} className="btn btn-ghost btn-sm">
              Ver semana
            </Link>
          </div>
          {data.today.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nadie tiene rutina hoy"
              action={
                <Link href="/trainer/rutinas/nueva" className="btn btn-secondary btn-sm">
                  Asignar ahora
                </Link>
              }
            />
          ) : (
            <ul className="space-y-1">
              {data.today.map((c) => (
                <li key={c.clientId}>
                  <Link
                    href={`/trainer/clientes/${c.clientId}?date=${today}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2"
                  >
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium">{c.name}</p>
                        <span className={c.done >= c.total ? 'badge badge-green' : c.done > 0 ? 'badge badge-yellow' : 'badge badge-gray'}>
                          {c.done}/{c.total}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted">{c.groups || 'Rutina'}</p>
                      <ProgressBar value={(c.done / c.total) * 100} className="mt-1.5 h-1.5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-4 sm:p-5">
            <h2 className="mb-1 flex items-center gap-2 font-semibold">
              <UserRoundX className="size-4 text-warn" /> Sin rutina pendiente
            </h2>
            <p className="mb-3 text-xs text-muted">Clientes activos sin ejercicios de hoy en adelante.</p>
            {data.idle.length === 0 ? (
              <p className="rounded-lg bg-ok/10 px-3 py-3 text-sm text-ok-fg">Todos tus clientes tienen rutina asignada. 🙌</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.idle.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 py-2">
                    <Link href={`/trainer/clientes/${c.id}`} className="min-w-0 flex-1 hover:underline">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-subtle">
                        {c.lastDate ? `Última: ${formatDate.short(String(c.lastDate))}` : 'Nunca ha tenido rutina'}
                      </p>
                    </Link>
                    <Link href={`/trainer/rutinas/nueva?client=${c.id}`} className="btn btn-secondary btn-sm">
                      Asignar
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Activity className="size-4 text-accent" /> Actividad reciente
            </h2>
            {data.recent.length === 0 ? (
              <p className="text-sm text-muted">Cuando tus clientes marquen ejercicios aparecerán aquí.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-start gap-2.5 text-sm">
                    <CalendarClock className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <p className="min-w-0 flex-1">
                      <Link href={`/trainer/clientes/${r.clientId}`} className="font-medium hover:underline">
                        {r.clientName}
                      </Link>{' '}
                      <span className="text-muted">completó</span> {r.exerciseName}
                      {r.weightKg !== null && <span className="text-ok-fg"> · {r.weightKg} kg</span>}
                      <span className="block text-xs text-subtle">{relativeTime(r.completedAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
