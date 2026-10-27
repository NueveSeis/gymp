'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarRange, CheckCircle2, Layers } from 'lucide-react'
import { createRoutineAction } from '@/actions/assignments'
import { ClientMultiPicker } from '@/components/pickers'
import { newItem, RoutineItemsEditor, toPayload, type EditorItem } from '@/components/routine-items-editor'
import { useAction } from '@/lib/client-utils'
import { addDays } from '@/lib/dates'
import type { ClientOption, ExerciseOption, TemplateWithItems } from '@/lib/queries'

type Template = { id: number; name: string; items: TemplateWithItems['items'] }

const fmt = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

function fromTemplate(t: Template): EditorItem[] {
  return t.items.map((i) =>
    newItem({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, restSeconds: i.restSeconds ?? '', notes: i.notes ?? '' })
  )
}

export function RoutineBuilder({
  clients,
  exercises,
  templates,
  initialClientIds,
  initialDate,
  initialTemplateId,
}: {
  clients: ClientOption[]
  exercises: ExerciseOption[]
  templates: Template[]
  initialClientIds: number[]
  initialDate: string
  initialTemplateId?: number
}) {
  const router = useRouter()
  const [pending, runAction] = useAction()
  const [clientIds, setClientIds] = useState(initialClientIds)
  const [date, setDate] = useState(initialDate)
  const [weeks, setWeeks] = useState(1)
  const [items, setItems] = useState<EditorItem[]>(() => {
    const t = templates.find((x) => x.id === initialTemplateId)
    return t ? fromTemplate(t) : [newItem()]
  })
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [templateName, setTemplateName] = useState('')

  const valid = toPayload(items)
  const total = clientIds.length * weeks * valid.length
  const dates = Array.from({ length: weeks }, (_, i) => addDays(date, i * 7))

  function loadTemplate(id: string) {
    const t = templates.find((x) => x.id === Number(id))
    if (!t) return
    const hasContent = items.some((i) => i.exerciseId !== '')
    setItems(hasContent ? [...items.filter((i) => i.exerciseId !== ''), ...fromTemplate(t)] : fromTemplate(t))
  }

  function submit() {
    runAction(
      () =>
        createRoutineAction({
          clientIds,
          startDate: date,
          repeatWeeks: weeks,
          items: valid,
          saveAsTemplate: saveTemplate ? templateName : '',
        }),
      {
        onSuccess: () => {
          router.push(`/trainer/rutinas?date=${date}${clientIds.length === 1 ? `&client=${clientIds[0]}` : ''}`)
        },
      }
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-5">
        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Ejercicios</h2>
            {templates.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <Layers className="size-4 text-muted" />
                <select className="input w-auto py-1.5" value="" onChange={(e) => loadTemplate(e.target.value)} aria-label="Cargar plantilla">
                  <option value="">Cargar plantilla…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.items.length})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <RoutineItemsEditor items={items} onChange={setItems} exercises={exercises} />
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
            Guardar también como plantilla
          </label>
          {saveTemplate && (
            <input
              className="input mt-2"
              placeholder="Nombre de la plantilla (ej. Pierna A)"
              maxLength={100}
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          )}
        </section>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">¿Para quién?</h2>
          <ClientMultiPicker clients={clients} selected={clientIds} onChange={setClientIds} />
        </section>

        <section className="card space-y-3 p-4 sm:p-5">
          <h2 className="font-semibold">¿Cuándo?</h2>
          <div>
            <label className="label" htmlFor="rb-date">
              Fecha
            </label>
            <input id="rb-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="rb-weeks">
              Repetir cada semana
            </label>
            <select id="rb-weeks" className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              <option value={1}>No, solo ese día</option>
              {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  Durante {n} semanas
                </option>
              ))}
            </select>
          </div>
          {date && weeks > 1 && (
            <p className="flex gap-2 text-xs text-muted">
              <CalendarRange className="size-4 shrink-0" />
              {dates.map((d) => fmt.format(new Date(`${d}T00:00:00Z`))).join(' · ')}
            </p>
          )}
        </section>

        <div className="card p-4 sm:p-5">
          <p className="text-sm text-muted">
            {total > 0 ? (
              <>
                Se crearán <b className="text-fg">{total}</b> ejercicios asignados
                {clientIds.length > 1 && <> para {clientIds.length} clientes</>}.
              </>
            ) : (
              'Elige clientes, fecha y al menos un ejercicio.'
            )}
          </p>
          <button
            className="btn btn-primary btn-lg mt-3 w-full"
            disabled={pending || total === 0 || !date || (saveTemplate && !templateName.trim())}
            onClick={submit}
          >
            <CheckCircle2 className="size-5" />
            {pending ? 'Asignando…' : 'Asignar rutina'}
          </button>
        </div>
      </aside>
    </div>
  )
}
