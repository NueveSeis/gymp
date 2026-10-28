'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { Check, ChevronDown, MessageSquareText, NotebookPen, PartyPopper, Timer, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { logSetAction, toggleCompleteAction } from '@/actions/client'
import { ExerciseThumb, ExerciseVideo } from '@/components/media'
import { useRestTimer } from '@/components/rest-timer'
import { ProgressRing } from '@/components/ui/basics'
import { hasVideo } from '@/lib/media'
import type { ClientDayItem } from '@/lib/queries'

type Item = ClientDayItem

export function DayWorkout({ items, editable, isToday }: { items: Item[]; editable: boolean; isToday: boolean }) {
  const [optimistic, setDone] = useOptimistic(items, (state, { id, done }: { id: number; done: boolean }) =>
    state.map((i) => (i.id === id ? { ...i, completed: done } : i))
  )
  const [, startTransition] = useTransition()

  const total = optimistic.length
  const done = optimistic.filter((i) => i.completed).length
  const pct = (done / total) * 100
  const groups = [...new Set(optimistic.map((i) => i.exercise.muscleGroup).filter(Boolean))] as string[]
  const totalSets = optimistic.reduce((s, i) => s + i.sets, 0)

  function toggle(item: Item) {
    if (!editable) {
      toast.info('Podrás marcar este ejercicio el día que te toca')
      return
    }
    const next = !item.completed
    startTransition(async () => {
      setDone({ id: item.id, done: next })
      if (next) navigator.vibrate?.(30)
      const res = await toggleCompleteAction(item.id, next)
      if (!res.ok) toast.error(res.error)
      else if (next && done + 1 === total) toast.success('¡Rutina completada! Excelente trabajo 🎉')
    })
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4 p-4">
        <ProgressRing value={pct} size={64} stroke={7}>
          {done}/{total}
        </ProgressRing>
        <div className="min-w-0 flex-1">
          {done === total ? (
            <p className="flex items-center gap-2 font-semibold text-ok-fg">
              <PartyPopper className="size-4" /> ¡Rutina completada!
            </p>
          ) : (
            <p className="font-semibold">
              {isToday ? 'Rutina de hoy' : 'Rutina del día'} · {total} ejercicios
            </p>
          )}
          <p className="mt-0.5 text-sm text-muted">{totalSets} series en total</p>
          {groups.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <span key={g} className="badge badge-blue">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <ol className="space-y-3">
        {optimistic.map((item, idx) => (
          <ExerciseCard key={item.id} item={item} index={idx + 1} editable={editable} onToggle={() => toggle(item)} />
        ))}
      </ol>
    </div>
  )
}

function ExerciseCard({ item, index, editable, onToggle }: { item: Item; index: number; editable: boolean; onToggle: () => void }) {
  const timer = useRestTimer()
  const [showVideo, setShowVideo] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const ex = item.exercise
  const video = hasVideo(ex)

  return (
    <li className={clsx('card overflow-hidden transition', item.completed && 'border-ok/30 bg-ok/[0.04]')}>
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <ExerciseThumb exercise={ex} className="size-20 shrink-0 rounded-xl sm:size-24" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-subtle">EJERCICIO {index}</p>
              <h3 className={clsx('font-semibold text-balance', item.completed && 'text-muted line-through decoration-ok/60')}>
                {ex.name}
              </h3>
            </div>
            <button
              onClick={onToggle}
              className={clsx(
                'grid size-10 shrink-0 place-items-center rounded-full border-2 transition active:scale-90',
                item.completed ? 'animate-pop border-ok bg-ok text-white' : 'border-line-strong text-transparent hover:border-ok/60 hover:text-ok/50',
                !editable && 'opacity-50'
              )}
              aria-pressed={item.completed}
              aria-label={item.completed ? `Desmarcar ${ex.name}` : `Marcar ${ex.name} como hecho`}
            >
              <Check className="size-5" strokeWidth={3} />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-bold text-brand-fg tabular-nums">
              {item.sets} × {item.reps}
            </span>
            {item.restSeconds ? <span className="text-muted">{item.restSeconds}s descanso</span> : null}
            {ex.muscleGroup && <span className="badge badge-gray">{ex.muscleGroup}</span>}
            {item.weightKg !== null && <span className="badge badge-green">{item.weightKg} kg</span>}
          </div>
          {item.bestWeight !== null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-warn-fg">
              <Trophy className="size-3.5" /> Tu récord: {item.bestWeight} kg
            </p>
          )}
        </div>
      </div>

      {item.trainerNotes && (
        <p className="mx-3 mb-3 flex gap-2 rounded-lg bg-brand/8 px-3 py-2 text-sm text-brand-fg sm:mx-4">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" />
          <span>{item.trainerNotes}</span>
        </p>
      )}
      {ex.description && showVideo && <p className="mx-4 mb-3 text-sm text-pretty whitespace-pre-line text-muted">{ex.description}</p>}

      <div className="flex flex-wrap gap-1 border-t border-line px-2 py-1.5">
        {(video || ex.description) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowVideo((v) => !v)} aria-expanded={showVideo}>
            <ChevronDown className={clsx('size-4 transition', showVideo && 'rotate-180')} />
            {video ? 'Video' : 'Detalles'}
          </button>
        )}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => timer?.start(item.restSeconds || 60, ex.name)}
        >
          <Timer className="size-4" /> Descanso {item.restSeconds ? `${item.restSeconds}s` : ''}
        </button>
        {editable && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
            <NotebookPen className="size-4" /> {item.weightKg !== null || item.clientNote ? 'Editar registro' : 'Registrar peso'}
          </button>
        )}
      </div>

      {showVideo && video && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <ExerciseVideo exercise={ex} />
        </div>
      )}
      {showLog && <LogForm item={item} onDone={() => setShowLog(false)} />}
    </li>
  )
}

function LogForm({ item, onDone }: { item: Item; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const [weight, setWeight] = useState(item.weightKg?.toString() ?? '')
  const [note, setNote] = useState(item.clientNote ?? '')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await logSetAction({ id: item.id, weightKg: weight, clientNote: note, markDone: true })
      if (!res.ok) return void toast.error(res.error)
      if (res.data?.pr) toast.success(res.message, { icon: <Trophy className="size-4 text-warn" /> })
      else toast.success(res.message)
      onDone()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3 border-t border-line bg-surface-2/50 p-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end sm:p-4">
      <div>
        <label className="label" htmlFor={`w-${item.id}`}>
          Peso (kg)
        </label>
        <input
          id={`w-${item.id}`}
          className="input"
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          max="1000"
          placeholder="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor={`n-${item.id}`}>
          Nota (opcional)
        </label>
        <input
          id={`n-${item.id}`}
          className="input"
          maxLength={255}
          placeholder="¿Cómo te sentiste?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
