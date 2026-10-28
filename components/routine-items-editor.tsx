'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { ExerciseSelect } from './pickers'
import type { ExerciseOption } from '@/lib/queries'

export type EditorItem = {
  key: string
  exerciseId: number | ''
  sets: number | ''
  reps: number | ''
  restSeconds: number | ''
  notes: string
}

let counter = 0
export function newItem(partial: Partial<Omit<EditorItem, 'key'>> = {}): EditorItem {
  counter += 1
  return { key: `i${Date.now()}-${counter}`, exerciseId: '', sets: 3, reps: 12, restSeconds: 60, notes: '', ...partial }
}

export function toPayload(items: EditorItem[]) {
  return items
    .filter((i) => i.exerciseId !== '')
    .map((i) => ({
      exerciseId: Number(i.exerciseId),
      sets: Number(i.sets) || 1,
      reps: Number(i.reps) || 1,
      restSeconds: i.restSeconds === '' ? null : Number(i.restSeconds),
      notes: i.notes.trim() || null,
    }))
}

const num = (v: string): number | '' => (v === '' ? '' : Number(v))

/** Editor de la lista de ejercicios de una rutina/plantilla */
export function RoutineItemsEditor({
  items,
  onChange,
  exercises,
}: {
  items: EditorItem[]
  onChange: (items: EditorItem[]) => void
  exercises: ExerciseOption[]
}) {
  const update = (key: string, patch: Partial<EditorItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const move = (idx: number, dir: -1 | 1) => {
    const next = [...items]
    const [it] = next.splice(idx, 1)
    next.splice(idx + dir, 0, it)
    onChange(next)
  }

  return (
    <div className="@container space-y-2">
      {items.map((item, idx) => (
        <div key={item.key} className="rounded-xl border border-line bg-surface-2/40 p-3">
          <div className="flex items-start gap-2">
            <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-brand/15 text-[11px] font-bold text-brand-fg">{idx + 1}</span>
            {/* Se adapta al ancho de la tarjeta, no de la pantalla */}
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2 @xl:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem]">
              <ExerciseSelect
                className="col-span-3 @xl:col-span-1"
                exercises={exercises}
                value={item.exerciseId}
                onChange={(v) => update(item.key, { exerciseId: v })}
              />
              <label className="relative">
                <span className="sr-only">Series</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="input pr-7"
                  value={item.sets}
                  onChange={(e) => update(item.key, { sets: num(e.target.value) })}
                  required
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-subtle">ser</span>
              </label>
              <label className="relative">
                <span className="sr-only">Repeticiones</span>
                <input
                  type="number"
                  min={1}
                  max={500}
                  className="input pr-8"
                  value={item.reps}
                  onChange={(e) => update(item.key, { reps: num(e.target.value) })}
                  required
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-subtle">reps</span>
              </label>
              <label className="relative">
                <span className="sr-only">Descanso en segundos</span>
                <input
                  type="number"
                  min={0}
                  max={900}
                  step={15}
                  className="input pr-12"
                  value={item.restSeconds}
                  onChange={(e) => update(item.key, { restSeconds: num(e.target.value) })}
                  placeholder="—"
                />
                <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-subtle">seg desc.</span>
              </label>
              <input
                className="input col-span-3 @xl:col-span-4"
                maxLength={255}
                placeholder="Nota opcional para el cliente (técnica, tempo, peso sugerido…)"
                value={item.notes}
                onChange={(e) => update(item.key, { notes: e.target.value })}
              />
            </div>
            <div className="flex shrink-0 flex-col">
              <button type="button" className="btn btn-ghost btn-icon" disabled={idx === 0} onClick={() => move(idx, -1)} aria-label="Subir">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" className="btn btn-ghost btn-icon" disabled={idx === items.length - 1} onClick={() => move(idx, 1)} aria-label="Bajar">
                <ArrowDown className="size-4" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon hover:text-danger-fg"
                onClick={() => onChange(items.filter((i) => i.key !== item.key))}
                aria-label="Quitar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-secondary w-full border-dashed"
        onClick={() => {
          const last = items[items.length - 1]
          onChange([...items, newItem(last ? { sets: last.sets, reps: last.reps, restSeconds: last.restSeconds } : {})])
        }}
      >
        <Plus className="size-4" /> Agregar ejercicio
      </button>
    </div>
  )
}
