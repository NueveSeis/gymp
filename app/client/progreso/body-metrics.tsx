'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { deleteBodyMetricAction, saveBodyMetricAction } from '@/actions/client'
import { useAction } from '@/lib/client-utils'
import type { BodyMetricRow } from '@/lib/queries'

const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function BodyMetrics({ metrics, today }: { metrics: BodyMetricRow[]; today: string }) {
  const [pending, runAction] = useAction()
  const [open, setOpen] = useState(metrics.length === 0)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="mt-5 border-t border-line pt-4">
      {open ? (
        <form
          ref={formRef}
          action={(fd) =>
            runAction(() => saveBodyMetricAction(fd), {
              onSuccess: () => {
                formRef.current?.reset()
                setOpen(false)
              },
            })
          }
          className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label className="label" htmlFor="bm-date">
              Fecha
            </label>
            <input id="bm-date" name="measuredOn" type="date" className="input" defaultValue={today} max={today} required />
          </div>
          <div>
            <label className="label" htmlFor="bm-w">
              Peso (kg)
            </label>
            <input id="bm-w" name="weightKg" type="number" step="0.1" min="20" max="400" inputMode="decimal" className="input" placeholder="72.5" />
          </div>
          <div>
            <label className="label" htmlFor="bm-f">
              % Grasa
            </label>
            <input id="bm-f" name="bodyFatPct" type="number" step="0.1" min="2" max="70" inputMode="decimal" className="input" placeholder="opcional" />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </button>
            {metrics.length > 0 && (
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      ) : (
        <button className="btn btn-secondary" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Registrar medida
        </button>
      )}

      {metrics.length > 0 && (
        <ul className="mt-4 divide-y divide-line text-sm">
          {metrics.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2">
              <span className="w-28 text-muted">{fmt.format(new Date(`${m.measuredOn}T00:00:00Z`))}</span>
              <span className="font-semibold tabular-nums">{m.weightKg !== null ? `${m.weightKg} kg` : '—'}</span>
              {m.bodyFatPct !== null && <span className="text-muted tabular-nums">{m.bodyFatPct}% grasa</span>}
              <button
                className="btn btn-ghost btn-icon ml-auto"
                aria-label="Eliminar medida"
                disabled={pending}
                onClick={() => runAction(() => deleteBodyMetricAction(m.id), { success: 'Medida eliminada' })}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
