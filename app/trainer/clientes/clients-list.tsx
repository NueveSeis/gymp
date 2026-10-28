'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarPlus, Lock, Pencil, Search, Unlock, Users } from 'lucide-react'
import clsx from 'clsx'
import { setUserActiveAction } from '@/actions/users'
import { Avatar } from '@/components/ui/basics'
import { ConfirmDialog } from '@/components/ui/modal'
import { useAction } from '@/lib/client-utils'
import { relativeTime } from '@/lib/dates'
import type { ClientWithActivity } from '@/lib/queries'
import { ClientFormModal } from './client-form'

type Filter = 'active' | 'inactive' | 'all'
const shortFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function ClientsList({ clients, today }: { clients: ClientWithActivity[]; today: string }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const [editing, setEditing] = useState<ClientWithActivity | null>(null)
  const [toggling, setToggling] = useState<ClientWithActivity | null>(null)
  const [pending, runAction] = useAction()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter(
      (c) =>
        (filter === 'all' || (filter === 'active' ? c.isActive : !c.isActive)) &&
        (!q || (c.fullName ?? '').toLowerCase().includes(q) || c.username.toLowerCase().includes(q))
    )
  }, [clients, query, filter])

  const counts = { active: clients.filter((c) => c.isActive).length, inactive: clients.filter((c) => !c.isActive).length, all: clients.length }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input className="input pl-9" placeholder="Buscar por nombre o usuario" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex rounded-lg border border-line bg-surface p-0.5 text-sm">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx('rounded-md px-3 py-1.5 font-medium transition', filter === f ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')}
            >
              {f === 'active' ? 'Activos' : f === 'inactive' ? 'Inactivos' : 'Todos'} <span className="text-subtle">{counts[f]}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center text-muted">
          <Users className="mb-3 size-8" />
          {clients.length === 0 ? 'Aún no tienes clientes. Crea el primero.' : 'Ningún cliente coincide con la búsqueda.'}
        </div>
      ) : (
        <div className="card divide-y divide-line">
          {visible.map((c) => {
            const name = c.fullName || c.username
            const planned = c.plannedUntil
            const noPlan = !planned || planned < today
            return (
              <div key={c.id} className={clsx('flex flex-wrap items-center gap-3 px-4 py-3', !c.isActive && 'opacity-60')}>
                <Link href={`/trainer/clientes/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium hover:underline">{name}</p>
                    <p className="truncate text-xs text-subtle">
                      @{c.username}
                      {c.goal && <> · {c.goal}</>}
                    </p>
                  </div>
                </Link>
                <div className="hidden w-36 text-xs md:block">
                  <p className="text-subtle">Rutina hasta</p>
                  <p className={clsx('font-medium', noPlan && c.isActive ? 'text-warn-fg' : 'text-fg')}>
                    {planned ? shortFmt.format(new Date(`${planned}T00:00:00Z`)) : 'Sin rutinas'}
                  </p>
                </div>
                <div className="hidden w-36 text-xs lg:block">
                  <p className="text-subtle">Último entreno</p>
                  <p className="font-medium">{relativeTime(c.lastCompletedAt)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!c.isActive && <span className="badge badge-red mr-1">Inactivo</span>}
                  {c.isActive && noPlan && <span className="badge badge-yellow mr-1 md:hidden">Sin rutina</span>}
                  <Link href={`/trainer/rutinas/nueva?client=${c.id}`} className="btn btn-ghost btn-icon" title="Asignar rutina" aria-label="Asignar rutina">
                    <CalendarPlus className="size-4" />
                  </Link>
                  <button className="btn btn-ghost btn-icon" onClick={() => setEditing(c)} title="Editar" aria-label="Editar">
                    <Pencil className="size-4" />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setToggling(c)}
                    title={c.isActive ? 'Desactivar' : 'Activar'}
                    aria-label={c.isActive ? 'Desactivar' : 'Activar'}
                  >
                    {c.isActive ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ClientFormModal open={!!editing} onClose={() => setEditing(null)} client={editing} />
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? 'Desactivar cliente' : 'Activar cliente'}
        message={
          toggling?.isActive
            ? 'No podrá iniciar sesión hasta que lo vuelvas a activar. Su historial se conserva.'
            : 'Podrá volver a iniciar sesión y ver sus rutinas.'
        }
        confirmLabel={toggling?.isActive ? 'Desactivar' : 'Activar'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        pending={pending}
        onConfirm={() => toggling && runAction(() => setUserActiveAction(toggling.id, !toggling.isActive), { onSuccess: () => setToggling(null) })}
      />
    </>
  )
}
