import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-[1.7rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'blue',
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: 'blue' | 'green' | 'yellow' | 'cyan' | 'red'
}) {
  const tones = {
    blue: 'bg-brand/12 text-brand-fg',
    green: 'bg-ok/12 text-ok-fg',
    yellow: 'bg-warn/12 text-warn-fg',
    cyan: 'bg-accent/12 text-accent',
    red: 'bg-danger/12 text-danger-fg',
  }
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <div className={clsx('grid size-11 shrink-0 place-items-center rounded-xl', tones[tone])}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl leading-none font-bold tabular-nums">{value}</div>
        <div className="mt-1 text-xs leading-snug text-muted">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] leading-snug text-subtle">{hint}</div>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-7" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-pretty text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, className, tone = 'brand' }: { value: number; className?: string; tone?: 'brand' | 'ok' }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={clsx('h-2 overflow-hidden rounded-full bg-surface-2', className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={clsx(
          'h-full rounded-full transition-[width] duration-500',
          tone === 'ok' || pct >= 100 ? 'bg-ok' : 'bg-gradient-to-r from-brand to-accent'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function ProgressRing({ value, size = 56, stroke = 6, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-surface-2" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className={clsx('fill-none transition-[stroke-dashoffset] duration-700', pct >= 100 ? 'stroke-ok' : 'stroke-brand')}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">{children}</div>
    </div>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const hues = [217, 189, 160, 262, 330, 28]
  const hue = hues[hash % hues.length]
  const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' }
  return (
    <div
      className={clsx('grid shrink-0 place-items-center rounded-full font-semibold', sizes[size])}
      style={{ background: `hsl(${hue} 70% 55% / 0.16)`, color: `hsl(${hue} 85% 75%)` }}
      aria-hidden
    >
      {initials || '?'}
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}
