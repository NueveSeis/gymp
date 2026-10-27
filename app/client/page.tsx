import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, Coffee } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { formatDate, isIsoDate, todayIso, weekDays } from '@/lib/dates'
import { getClientDay, getDailyAggregates, getUpcomingDates } from '@/lib/queries'
import { WeekStrip } from '@/components/week-strip'
import { EmptyState } from '@/components/ui/basics'
import { DayWorkout } from './day-workout'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Mi rutina · ${systemName}` }
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: process.env.APP_TIMEZONE || 'America/Mexico_City' }).format(new Date()))
  return hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default async function ClientTodayPage({ searchParams }: PageProps<'/client'>) {
  const session = await requirePageUser('client')
  const sp = await searchParams
  const today = todayIso()
  const date = isIsoDate(sp.date) ? sp.date : today
  const week = weekDays(date)

  const [days, items] = await Promise.all([
    getDailyAggregates(session.id, week[0], week[6]),
    getClientDay(session.id, date),
  ])
  const upcoming = items.length === 0 ? await getUpcomingDates(session.id, today, 1) : []
  const firstName = session.name.split(' ')[0]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">{greeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName} 💪</h1>
      </div>

      <WeekStrip date={date} today={today} days={days} basePath="/client" />

      <h2 className="pt-1 text-sm font-semibold text-muted">
        {date === today ? 'Hoy · ' : ''}
        {formatDate.full(date)}
      </h2>

      {items.length === 0 ? (
        <EmptyState
          icon={date < today ? CalendarCheck : Coffee}
          title={date < today ? 'No hubo rutina este día' : 'Día de descanso'}
          action={
            upcoming[0] && upcoming[0] !== date ? (
              <Link href={`/client?date=${upcoming[0]}`} className="btn btn-secondary">
                Ver próxima rutina · {formatDate.short(upcoming[0])}
              </Link>
            ) : undefined
          }
        >
          {date < today
            ? 'Elige otro día en la semana para ver tus entrenamientos.'
            : 'Tu entrenador no te asignó ejercicios para este día. Recupérate, hidrátate y duerme bien.'}
        </EmptyState>
      ) : (
        <DayWorkout key={date} items={items} editable={date <= today} isToday={date === today} />
      )}
    </div>
  )
}
