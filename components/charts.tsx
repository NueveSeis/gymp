// Gráficas en SVG puro: se renderizan en el servidor, cero JavaScript extra.
import clsx from 'clsx'
import { formatDate } from '@/lib/dates'

type Point = { date: string; value: number }

function scale(points: Point[], width: number, height: number, pad: number) {
  const values = points.map((p) => p.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i / (points.length - 1)) * (width - pad * 2))
  const y = (v: number) => pad + (1 - (v - min) / (max - min)) * (height - pad * 2)
  return { x, y, min, max }
}

export function Sparkline({ points, className }: { points: Point[]; className?: string }) {
  if (points.length === 0) return null
  const w = 120
  const h = 36
  const { x, y } = scale(points, w, h, 4)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const last = points.length - 1
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={clsx('h-9 w-28', className)} aria-hidden>
      <path d={d} className="fill-none stroke-brand" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(points[last].value)} r={3} className="fill-accent" />
    </svg>
  )
}

export function LineChart({ points, unit, height = 180 }: { points: Point[]; unit: string; height?: number }) {
  if (points.length === 0) return null
  const w = 640
  const h = height
  const pad = 22
  const { x, y, min, max } = scale(points, w, h, pad)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${d} L${x(points.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`
  const gridValues = [max, (max + min) / 2, min]
  const labelIdx = points.length <= 6 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h + 18}`} className="w-full" role="img" aria-label={`Gráfica en ${unit}`}>
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--color-brand)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--color-brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridValues.map((v, i) => (
        <g key={i}>
          <line x1={pad} x2={w - pad} y1={y(v)} y2={y(v)} className="stroke-line" strokeDasharray="3 5" />
          <text x={w - pad} y={y(v) - 5} textAnchor="end" className="fill-subtle text-[11px]">
            {Number(v.toFixed(1))} {unit}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#area-fill)" />
      <path d={d} className="fill-none stroke-brand" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={p.date + i} cx={x(i)} cy={y(p.value)} r={points.length > 30 ? 2 : 3.5} className="fill-bg stroke-accent" strokeWidth={2}>
          <title>{`${formatDate.medium(p.date)}: ${p.value} ${unit}`}</title>
        </circle>
      ))}
      {labelIdx.map((i) => (
        <text key={i} x={x(i)} y={h + 12} textAnchor="middle" className="fill-subtle text-[11px]">
          {formatDate.short(points[i].date)}
        </text>
      ))}
    </svg>
  )
}

const LEVEL_CLASS = ['bg-surface-2', 'bg-danger/35', 'bg-brand/35', 'bg-brand/65', 'bg-ok']

/** Mapa de constancia estilo GitHub: una columna por semana */
export function Heatmap({
  cells,
}: {
  cells: { date: string; level: 0 | 1 | 2 | 3 | 4; total: number; done: number; future: boolean }[]
}) {
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto scrollbar-none">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((c) => (
              <div
                key={c.date}
                className={clsx('size-3.5 rounded-[4px] sm:size-4', c.future ? 'bg-surface-2/40' : LEVEL_CLASS[c.level])}
                title={`${formatDate.medium(c.date)} · ${c.total ? `${c.done}/${c.total} ejercicios` : 'Sin rutina'}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-subtle">
        <Legend className="bg-surface-2" label="Descanso" />
        <Legend className="bg-danger/35" label="No hecho" />
        <Legend className="bg-brand/65" label="Parcial" />
        <Legend className="bg-ok" label="Completo" />
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={clsx('size-3 rounded-[3px]', className)} /> {label}
    </span>
  )
}
