import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { addDays, formatDate, weekDays } from '@/lib/dates'
import type { DayAgg } from '@/lib/stats'

/** Tira semanal con el estado de cada día. `hrefFor` arma el enlace de cada fecha. */
export function WeekStrip({
  date,
  today,
  days,
  basePath,
  extraQuery = '',
}: {
  date: string
  today: string
  days: DayAgg[]
  basePath: string
  extraQuery?: string
}) {
  const week = weekDays(date)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const href = (d: string) => `${basePath}?date=${d}${extraQuery}`

  return (
    <div className="card p-2">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <span className="text-sm font-semibold">{formatDate.month(date)}</span>
        <div className="flex items-center gap-1">
          {date !== today && (
            <Link href={href(today)} className="btn btn-ghost btn-sm">
              Hoy
            </Link>
          )}
          <Link href={href(addDays(date, -7))} className="btn btn-ghost btn-icon" aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={href(addDays(date, 7))} className="btn btn-ghost btn-icon" aria-label="Semana siguiente">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {week.map((d) => {
          const agg = byDate.get(d)
          const selected = d === date
          const isToday = d === today
          const status = !agg ? 'rest' : agg.done >= agg.total ? 'done' : agg.done > 0 ? 'partial' : d < today ? 'missed' : 'pending'
          return (
            <Link
              key={d}
              href={href(d)}
              scroll={false}
              className={clsx(
                'flex flex-col items-center gap-1 rounded-xl py-2 transition',
                selected ? 'bg-brand text-white shadow-lg shadow-brand/25' : 'hover:bg-surface-2'
              )}
              aria-current={selected ? 'date' : undefined}
            >
              <span className={clsx('text-[11px] font-medium uppercase', selected ? 'text-white/80' : 'text-subtle')}>
                {formatDate.weekday(d)}
              </span>
              <span className={clsx('text-base leading-none font-bold tabular-nums', isToday && !selected && 'text-brand-fg')}>
                {formatDate.dayNum(d)}
              </span>
              <span
                className={clsx(
                  'size-1.5 rounded-full',
                  status === 'rest' && 'bg-transparent',
                  status === 'done' && (selected ? 'bg-white' : 'bg-ok'),
                  status === 'partial' && (selected ? 'bg-white/70' : 'bg-warn'),
                  status === 'missed' && (selected ? 'bg-white/50' : 'bg-danger/70'),
                  status === 'pending' && (selected ? 'bg-white/70' : 'bg-brand-fg')
                )}
              />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
