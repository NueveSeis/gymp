'use client'

import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import clsx from 'clsx'
import type { ClientOption, ExerciseOption } from '@/lib/queries'

/** <select> nativo agrupado por grupo muscular (rápido y cómodo en celular) */
export function ExerciseSelect({
  exercises,
  value,
  onChange,
  id,
  name,
  className,
}: {
  exercises: ExerciseOption[]
  value: number | ''
  onChange?: (id: number | '') => void
  id?: string
  name?: string
  className?: string
}) {
  const groups = useMemo(() => {
    const map = new Map<string, ExerciseOption[]>()
    for (const e of exercises) {
      const key = e.muscleGroup || 'Otros'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort(([a], [b]) => (a === 'Otros' ? 1 : b === 'Otros' ? -1 : a.localeCompare(b, 'es')))
  }, [exercises])

  return (
    <select
      id={id}
      name={name}
      className={clsx('input', className)}
      value={value}
      onChange={(e) => onChange?.(e.target.value ? Number(e.target.value) : '')}
      aria-label={id ? undefined : 'Ejercicio'}
      required
    >
      <option value="">Elige un ejercicio…</option>
      {groups.map(([group, list]) => (
        <optgroup key={group} label={group}>
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/** Lista con búsqueda para elegir uno o varios clientes */
export function ClientMultiPicker({
  clients,
  selected,
  onChange,
  maxHeight = 'max-h-56',
}: {
  clients: ClientOption[]
  selected: number[]
  onChange: (ids: number[]) => void
  maxHeight?: string
}) {
  const [query, setQuery] = useState('')
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
  const toggle = (id: number) => onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])

  return (
    <div className="rounded-xl border border-line-strong bg-bg/40">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search className="size-4 text-subtle" />
        <input
          className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-subtle"
          placeholder="Buscar cliente…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selected.length > 0 && <span className="badge badge-blue shrink-0">{selected.length}</span>}
      </div>
      <ul className={clsx('overflow-y-auto p-1', maxHeight)}>
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-subtle">Sin resultados</li>}
        {filtered.map((c) => {
          const on = selected.includes(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                className={clsx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition', on ? 'bg-brand/12' : 'hover:bg-surface-2')}
                aria-pressed={on}
              >
                <span
                  className={clsx(
                    'grid size-5 shrink-0 place-items-center rounded-md border transition',
                    on ? 'border-brand bg-brand text-white' : 'border-line-strong'
                  )}
                >
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {c.name}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
