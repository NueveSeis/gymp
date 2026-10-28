import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Layers, Plus } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { addDays, formatDate, isIsoDate, todayIso, weekDays } from '@/lib/dates'
import { getAssignmentsInRange, listClientOptions, listExerciseOptions, type RangeAssignment } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { ClientFilter, RoutinesBoard, type DayGroup } from './routines-board'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Rutinas · ${systemName}` }
}

export default async function RoutinesPage({ searchParams }: PageProps<'/trainer/rutinas'>) {
  await requirePageUser('staff')
  const sp = await searchParams
  const today = todayIso()
  const date = isIsoDate(sp.date) ? sp.date : today
  const clientId = Number(sp.client) || undefined
  const week = weekDays(date)

  const [rows, clients, exercises] = await Promise.all([
    getAssignmentsInRange(week[0], week[6], clientId),
    listClientOptions(),
    listExerciseOptions(),
  ])

  const days: DayGroup[] = week.map((d) => {
    const byClient = new Map<number, { clientId: number; clientName: string; items: RangeAssignment[] }>()
    for (const r of rows) {
      if (String(r.scheduledDate) !== d) continue
      let g = byClient.get(r.clientId)
      if (!g) byClient.set(r.clientId, (g = { clientId: r.clientId, clientName: r.clientName, items: [] }))
      g.items.push(r)
    }
    return { date: d, groups: [...byClient.values()] }
  })

  const q = (d: string) => `/trainer/rutinas?date=${d}${clientId ? `&client=${clientId}` : ''}`

  return (
    <>
      <PageHeader
        title="Rutinas"
        subtitle="Todo lo asignado en la semana. Edita, copia o elimina días completos."
        actions={
          <>
            <Link href="/trainer/plantillas" className="btn btn-secondary">
              <Layers className="size-4" /> Plantillas
            </Link>
            <Link href={`/trainer/rutinas/nueva${clientId ? `?client=${clientId}` : ''}`} className="btn btn-primary">
              <Plus className="size-4" /> Asignar rutina
            </Link>
          </>
        }
      />

      <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-1">
          <Link href={q(addDays(date, -7))} className="btn btn-ghost btn-icon" aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </Link>
          <span className="min-w-44 text-center text-sm font-semibold">
            {formatDate.short(week[0])} – {formatDate.medium(week[6])}
          </span>
          <Link href={q(addDays(date, 7))} className="btn btn-ghost btn-icon" aria-label="Semana siguiente">
            <ChevronRight className="size-4" />
          </Link>
          {!week.includes(today) && (
            <Link href={q(today)} className="btn btn-ghost btn-sm">
              Esta semana
            </Link>
          )}
        </div>
        <ClientFilter clients={clients} value={clientId} date={date} />
      </div>

      <RoutinesBoard days={days} today={today} clients={clients} exercises={exercises} />
    </>
  )
}
