'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Copy, MessageSquareText, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { copyDayAction, deleteAssignmentAction, deleteDayAction, updateAssignmentAction } from '@/actions/assignments'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { ClientMultiPicker, ExerciseSelect } from '@/components/pickers'
import { useAction } from '@/lib/client-utils'
import { addDays, capFirst } from '@/lib/dates'
import type { ClientOption, ExerciseOption, RangeAssignment } from '@/lib/queries'

export type DayGroup = { date: string; groups: { clientId: number; clientName: string; items: RangeAssignment[] }[] }

const dayFmt = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' })
const fmtDay = (iso: string) => dayFmt.format(new Date(`${iso}T00:00:00Z`))

export function ClientFilter({ clients, value, date }: { clients: ClientOption[]; value?: number; date: string }) {
  const router = useRouter()
  return (
    <select
      className="input w-full sm:w-64"
      value={value ?? ''}
      onChange={(e) => router.push(`/trainer/rutinas?date=${date}${e.target.value ? `&client=${e.target.value}` : ''}`)}
      aria-label="Filtrar por cliente"
    >
      <option value="">Todos los clientes</option>
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

type Dialog =
  | { kind: 'edit'; item: RangeAssignment }
  | { kind: 'delete'; item: RangeAssignment }
  | { kind: 'deleteDay'; clientId: number; clientName: string; date: string; count: number }
  | { kind: 'copy'; clientId: number; clientName: string; date: string }
  | null

export function RoutinesBoard({
  days,
  today,
  clients,
  exercises,
  showClient = true,
}: {
  days: DayGroup[]
  today: string
  clients: ClientOption[]
  exercises: ExerciseOption[]
  showClient?: boolean
}) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const [pending, runAction] = useAction()
  const close = () => setDialog(null)

  return (
    <div className="space-y-5">
      {days.map((day) => (
        <section key={day.date}>
          <h2 className={clsx('mb-2 flex items-center gap-2 text-sm font-semibold', day.date === today ? 'text-brand-fg' : 'text-muted')}>
            {capFirst(fmtDay(day.date))}
            {day.date === today && <span className="badge badge-blue normal-case">Hoy</span>}
          </h2>
          {day.groups.length === 0 ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-line px-4 py-3 text-sm text-subtle">
              Sin rutinas
              <Link href={`/trainer/rutinas/nueva?date=${day.date}`} className="btn btn-ghost btn-sm">
                <Plus className="size-3.5" /> Asignar
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {day.groups.map((g) => {
                const done = g.items.filter((i) => i.completed).length
                return (
                  <article key={g.clientId} className="card overflow-hidden">
                    <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                      {showClient ? (
                        <Link href={`/trainer/clientes/${g.clientId}?date=${day.date}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                          {g.clientName}
                        </Link>
                      ) : (
                        <span className="flex-1 font-semibold">{g.items.length} ejercicios</span>
                      )}
                      <span className={done === g.items.length ? 'badge badge-green' : done ? 'badge badge-yellow' : 'badge badge-gray'}>
                        {done}/{g.items.length}
                      </span>
                      <DayMenu
                        onAdd={`/trainer/rutinas/nueva?client=${g.clientId}&date=${day.date}`}
                        onCopy={() => setDialog({ kind: 'copy', clientId: g.clientId, clientName: g.clientName, date: day.date })}
                        onDelete={() =>
                          setDialog({ kind: 'deleteDay', clientId: g.clientId, clientName: g.clientName, date: day.date, count: g.items.length })
                        }
                      />
                    </header>
                    <ol className="divide-y divide-line">
                      {g.items.map((item, idx) => (
                        <li key={item.id} className="group flex items-center gap-3 px-4 py-2.5">
                          <span
                            className={clsx(
                              'grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold',
                              item.completed ? 'bg-ok text-white' : 'bg-surface-2 text-muted'
                            )}
                            title={item.completed ? 'Completado' : 'Pendiente'}
                          >
                            {item.completed ? <Check className="size-3.5" strokeWidth={3} /> : idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.exerciseName}</p>
                            <p className="flex flex-wrap gap-x-2 text-xs text-muted">
                              <span className="font-semibold text-brand-fg tabular-nums">
                                {item.sets}×{item.reps}
                              </span>
                              {item.restSeconds ? <span>{item.restSeconds}s</span> : null}
                              {item.weightKg !== null && <span className="text-ok-fg">{item.weightKg} kg</span>}
                              {item.trainerNotes && <MessageSquareText className="size-3.5" aria-label="Tiene nota" />}
                              {item.clientNote && <span className="truncate italic">“{item.clientNote}”</span>}
                            </p>
                          </div>
                          <div className="flex shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                            <button className="btn btn-ghost btn-icon" onClick={() => setDialog({ kind: 'edit', item })} aria-label="Editar">
                              <Pencil className="size-4" />
                            </button>
                            <button className="btn btn-ghost btn-icon hover:text-danger-fg" onClick={() => setDialog({ kind: 'delete', item })} aria-label="Eliminar">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      ))}

      <EditAssignmentModal item={dialog?.kind === 'edit' ? dialog.item : null} exercises={exercises} onClose={close} />

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onClose={close}
        title="Quitar ejercicio"
        message={dialog?.kind === 'delete' ? <>Se quitará <b>{dialog.item.exerciseName}</b> de la rutina de {dialog.item.clientName}.</> : null}
        confirmLabel="Quitar"
        pending={pending}
        onConfirm={() => dialog?.kind === 'delete' && runAction(() => deleteAssignmentAction(dialog.item.id), { onSuccess: close })}
      />
      <ConfirmDialog
        open={dialog?.kind === 'deleteDay'}
        onClose={close}
        title="Eliminar día completo"
        message={
          dialog?.kind === 'deleteDay' ? (
            <>
              Se eliminarán los {dialog.count} ejercicios de <b>{dialog.clientName}</b> del {fmtDay(dialog.date)}, incluido lo que ya registró.
            </>
          ) : null
        }
        pending={pending}
        onConfirm={() => dialog?.kind === 'deleteDay' && runAction(() => deleteDayAction(dialog.clientId, dialog.date), { onSuccess: close })}
      />
      {dialog?.kind === 'copy' && <CopyDayModal source={dialog} clients={clients} onClose={close} />}
    </div>
  )
}

function DayMenu({ onAdd, onCopy, onDelete }: { onAdd: string; onCopy: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="btn btn-ghost btn-icon -mr-2" onClick={() => setOpen((o) => !o)} aria-label="Opciones del día" aria-expanded={open}>
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 z-20 mt-1 w-48 animate-fade-in overflow-hidden rounded-xl border border-line-strong bg-elevated p-1 shadow-xl">
            <Link href={onAdd} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2">
              <Plus className="size-4" /> Agregar ejercicios
            </Link>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
              onClick={() => {
                setOpen(false)
                onCopy()
              }}
            >
              <Copy className="size-4" /> Copiar día…
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-fg hover:bg-danger/10"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
            >
              <Trash2 className="size-4" /> Eliminar día
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function EditAssignmentModal({ item, exercises, onClose }: { item: RangeAssignment | null; exercises: ExerciseOption[]; onClose: () => void }) {
  const [pending, runAction] = useAction()
  const [exerciseId, setExerciseId] = useState<number | ''>('')
  const current = item ? (exerciseId === '' ? item.exerciseId : exerciseId) : ''

  return (
    <Modal
      open={!!item}
      onClose={() => {
        setExerciseId('')
        onClose()
      }}
      title="Editar ejercicio"
      description={item ? `${item.clientName}` : undefined}
    >
      {item && (
        <form
          action={(fd) =>
            runAction(() => updateAssignmentAction(fd), {
              onSuccess: () => {
                setExerciseId('')
                onClose()
              },
            })
          }
          className="space-y-4"
        >
          <input type="hidden" name="id" value={item.id} />
          <div>
            <label className="label" htmlFor="ea-ex">
              Ejercicio
            </label>
            <ExerciseSelect id="ea-ex" name="exerciseId" exercises={exercises} value={current} onChange={setExerciseId} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label" htmlFor="ea-sets">
                Series
              </label>
              <input id="ea-sets" name="sets" type="number" min={1} max={50} className="input" defaultValue={item.sets} required />
            </div>
            <div>
              <label className="label" htmlFor="ea-reps">
                Reps
              </label>
              <input id="ea-reps" name="reps" type="number" min={1} max={500} className="input" defaultValue={item.reps} required />
            </div>
            <div>
              <label className="label" htmlFor="ea-rest">
                Desc. (s)
              </label>
              <input id="ea-rest" name="restSeconds" type="number" min={0} max={900} step={15} className="input" defaultValue={item.restSeconds ?? ''} placeholder="60" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ea-date">
              Fecha
            </label>
            <input id="ea-date" name="scheduledDate" type="date" className="input" defaultValue={String(item.scheduledDate)} required />
          </div>
          <div>
            <label className="label" htmlFor="ea-notes">
              Nota para el cliente
            </label>
            <input id="ea-notes" name="trainerNotes" maxLength={255} className="input" defaultValue={item.trainerNotes ?? ''} placeholder="Ej. baja controlado, 3 seg" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

function CopyDayModal({
  source,
  clients,
  onClose,
}: {
  source: { clientId: number; clientName: string; date: string }
  clients: ClientOption[]
  onClose: () => void
}) {
  const [pending, runAction] = useAction()
  const [targets, setTargets] = useState<number[]>([source.clientId])
  const [toDate, setToDate] = useState(addDays(source.date, 7))
  const [weeks, setWeeks] = useState(1)

  return (
    <Modal open onClose={onClose} title="Copiar día" description={`Rutina de ${source.clientName} · ${fmtDay(source.date)}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="cd-date">
              Copiar al día
            </label>
            <input id="cd-date" type="date" className="input" value={toDate} onChange={(e) => setToDate(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="cd-weeks">
              Repetir
            </label>
            <select id="cd-weeks" className="input" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
              <option value={1}>Solo ese día</option>
              {[2, 3, 4, 6, 8, 12].map((n) => (
                <option key={n} value={n}>
                  {n} semanas
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <span className="label">Para</span>
          <ClientMultiPicker clients={clients} selected={targets} onChange={setTargets} maxHeight="max-h-48" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={pending || targets.length === 0 || !toDate}
            onClick={() =>
              runAction(
                () => copyDayAction({ fromClientId: source.clientId, fromDate: source.date, toClientIds: targets, toDate, repeatWeeks: weeks }),
                { onSuccess: onClose }
              )
            }
          >
            <Copy className="size-4" /> {pending ? 'Copiando…' : 'Copiar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
