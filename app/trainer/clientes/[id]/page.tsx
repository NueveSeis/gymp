import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarPlus, ChevronLeft, ChevronRight, NotebookText, Phone, Target } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { addDays, formatDate, isIsoDate, relativeTime, todayIso, weekDays } from '@/lib/dates'
import {
  countCompleted,
  getAssignmentsInRange,
  getBodyMetrics,
  getClient,
  getDailyAggregates,
  getWeightProgress,
  listClientOptions,
  listExerciseOptions,
} from '@/lib/queries'
import { Avatar } from '@/components/ui/basics'
import { BodyWeightChart, ConsistencyCard, ProgressStats, StrengthCard } from '@/components/progress-sections'
import { RoutinesBoard, type DayGroup } from '../../rutinas/routines-board'
import { EditClientButton } from '../client-form'

export async function generateMetadata({ params }: PageProps<'/trainer/clientes/[id]'>): Promise<Metadata> {
  const [{ id }, { systemName }] = await Promise.all([params, getSettings()])
  const client = await getClient(Number(id))
  return { title: `${client?.fullName || client?.username || 'Cliente'} · ${systemName}` }
}

export default async function ClientDetailPage({ params, searchParams }: PageProps<'/trainer/clientes/[id]'>) {
  await requirePageUser('staff')
  const [{ id: rawId }, sp] = await Promise.all([params, searchParams])
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const today = todayIso()
  const date = isIsoDate(sp.date) ? sp.date : today
  const week = weekDays(date)

  const [client, days, weekRows, completed, strength, metrics, clients, exercises] = await Promise.all([
    getClient(id),
    getDailyAggregates(id, addDays(today, -365), addDays(today, 7)),
    getAssignmentsInRange(week[0], week[6], id),
    countCompleted(id),
    getWeightProgress(id, addDays(today, -180)),
    getBodyMetrics(id),
    listClientOptions(),
    listExerciseOptions(),
  ])
  if (!client) notFound()

  const name = client.fullName || client.username
  const board: DayGroup[] = week.map((d) => {
    const items = weekRows.filter((r) => String(r.scheduledDate) === d)
    return { date: d, groups: items.length ? [{ clientId: id, clientName: name, items }] : [] }
  })
  const latestWeight = metrics.find((m) => m.weightKg !== null)?.weightKg ?? null
  const base = `/trainer/clientes/${id}`

  return (
    <>
      <Link href="/trainer/clientes" className="btn btn-ghost btn-sm mb-3 -ml-2">
        <ArrowLeft className="size-4" /> Clientes
      </Link>

      <header className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-bold tracking-tight">{name}</h1>
            {!client.isActive && <span className="badge badge-red">Inactivo</span>}
          </div>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-muted">
            <span>@{client.username}</span>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-fg">
                <Phone className="size-3.5" /> {client.phone}
              </a>
            )}
            <span>Último acceso: {relativeTime(client.lastLoginAt)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <EditClientButton client={client} />
          <Link href={`/trainer/rutinas/nueva?client=${id}`} className="btn btn-primary">
            <CalendarPlus className="size-4" /> Asignar
          </Link>
        </div>
      </header>

      {(client.goal || client.notes) && (
        <div className="mb-5 grid gap-3 md:grid-cols-2">
          {client.goal && (
            <div className="card flex gap-3 p-4">
              <Target className="mt-0.5 size-5 shrink-0 text-accent" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Objetivo</p>
                <p className="mt-0.5 text-sm">{client.goal}</p>
              </div>
            </div>
          )}
          {client.notes && (
            <div className="card flex gap-3 p-4">
              <NotebookText className="mt-0.5 size-5 shrink-0 text-warn" />
              <div>
                <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Notas privadas</p>
                <p className="mt-0.5 text-sm whitespace-pre-line">{client.notes}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-5">
        <ProgressStats days={days} today={today} completed={completed} latestWeight={latestWeight} />

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Semana</h2>
            <div className="flex items-center gap-1">
              <Link href={`${base}?date=${addDays(date, -7)}`} className="btn btn-ghost btn-icon" aria-label="Semana anterior" scroll={false}>
                <ChevronLeft className="size-4" />
              </Link>
              <span className="min-w-40 text-center text-sm font-medium">
                {formatDate.short(week[0])} – {formatDate.medium(week[6])}
              </span>
              <Link href={`${base}?date=${addDays(date, 7)}`} className="btn btn-ghost btn-icon" aria-label="Semana siguiente" scroll={false}>
                <ChevronRight className="size-4" />
              </Link>
              {!week.includes(today) && (
                <Link href={base} className="btn btn-ghost btn-sm" scroll={false}>
                  Hoy
                </Link>
              )}
            </div>
          </div>
          <RoutinesBoard days={board} today={today} clients={clients} exercises={exercises} showClient={false} />
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <ConsistencyCard days={days} today={today} />
          <StrengthCard progress={strength} />
        </div>
        <section className="card p-4 sm:p-5">
          <h2 className="mb-4 font-semibold">Peso corporal</h2>
          <BodyWeightChart metrics={metrics} />
        </section>
      </div>
    </>
  )
}
