'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import {
  CalendarDays,
  ClipboardList,
  Dumbbell,
  Layers,
  LayoutDashboard,
  Settings,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

const ICONS = {
  dashboard: LayoutDashboard,
  routines: ClipboardList,
  clients: Users,
  exercises: Dumbbell,
  templates: Layers,
  settings: Settings,
  today: CalendarDays,
  progress: TrendingUp,
  profile: User,
} satisfies Record<string, LucideIcon>

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean }

function useIsActive() {
  const pathname = usePathname()
  return (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + '/'))
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive()
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
              active ? 'bg-brand/12 text-brand-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-[18px]" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function TopNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive()
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = isActive(item)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Barra inferior tipo app para celulares */
export function BottomNav({ items }: { items: NavItem[] }) {
  const isActive = useIsActive()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-safe backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const Icon = ICONS[item.icon]
          const active = isActive(item)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                active ? 'text-brand-fg' : 'text-subtle'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={clsx('size-5 transition', active && 'scale-110')} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
