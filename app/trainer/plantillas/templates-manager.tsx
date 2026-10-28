'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Layers, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { deleteTemplateAction, saveTemplateAction } from '@/actions/templates'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { newItem, RoutineItemsEditor, toPayload, type EditorItem } from '@/components/routine-items-editor'
import { useAction } from '@/lib/client-utils'
import type { ExerciseOption, TemplateWithItems } from '@/lib/queries'

export function TemplatesManager({ templates, exercises }: { templates: TemplateWithItems[]; exercises: ExerciseOption[] }) {
  const [editing, setEditing] = useState<TemplateWithItems | 'new' | null>(null)
  const [deleting, setDeleting] = useState<TemplateWithItems | null>(null)
  const [pending, runAction] = useAction()

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          onClick={() => setEditing('new')}
          className="card flex min-h-40 flex-col items-center justify-center gap-2 border-dashed text-muted transition hover:border-brand hover:text-brand-fg"
        >
          <Plus className="size-6" />
          <span className="text-sm font-medium">Nueva plantilla</span>
        </button>
        {templates.map((t) => (
          <article key={t.id} className="card flex flex-col p-4">
            <div className="mb-2 flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/12 text-brand-fg">
                <Layers className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{t.name}</h3>
                <p className="truncate text-xs text-muted">{t.description || `${t.items.length} ejercicios`}</p>
              </div>
            </div>
            <ol className="mb-3 space-y-1 text-sm">
              {t.items.slice(0, 6).map((i, idx) => (
                <li key={i.id} className="flex gap-2">
                  <span className="w-4 text-right text-subtle tabular-nums">{idx + 1}</span>
                  <span className={i.archived ? 'truncate text-subtle line-through' : 'truncate'}>{i.exerciseName}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted tabular-nums">
                    {i.sets}×{i.reps}
                  </span>
                </li>
              ))}
              {t.items.length > 6 && <li className="pl-6 text-xs text-subtle">+{t.items.length - 6} más</li>}
            </ol>
            <div className="mt-auto flex gap-1 border-t border-line pt-3">
              <Link href={`/trainer/rutinas/nueva?template=${t.id}`} className="btn btn-primary btn-sm flex-1">
                <Send className="size-3.5" /> Asignar
              </Link>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t)}>
                <Pencil className="size-3.5" /> Editar
              </button>
              <button className="btn btn-ghost btn-sm hover:text-danger-fg" onClick={() => setDeleting(t)} aria-label="Eliminar plantilla">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <TemplateModal template={editing === 'new' ? null : editing} exercises={exercises} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar plantilla"
        message={<>¿Eliminar <b>{deleting?.name}</b>? Las rutinas ya asignadas no se modifican.</>}
        pending={pending}
        onConfirm={() => deleting && runAction(() => deleteTemplateAction(deleting.id), { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

function TemplateModal({ template, exercises, onClose }: { template: TemplateWithItems | null; exercises: ExerciseOption[]; onClose: () => void }) {
  const [pending, runAction] = useAction()
  const [name, setName] = useState(template?.name ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [items, setItems] = useState<EditorItem[]>(() =>
    template?.items.length
      ? template.items
          .filter((i) => !i.archived)
          .map((i) => newItem({ exerciseId: i.exerciseId, sets: i.sets, reps: i.reps, restSeconds: i.restSeconds ?? '', notes: i.notes ?? '' }))
      : [newItem()]
  )
  const payload = toPayload(items)

  return (
    <Modal open onClose={onClose} title={template ? 'Editar plantilla' : 'Nueva plantilla'} size="xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tp-name">
              Nombre
            </label>
            <input id="tp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Pierna A" maxLength={100} autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="tp-desc">
              Descripción
            </label>
            <input id="tp-desc" className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="opcional" maxLength={255} />
          </div>
        </div>
        <RoutineItemsEditor items={items} onChange={setItems} exercises={exercises} />
        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={pending || !name.trim() || payload.length === 0}
            onClick={() =>
              runAction(() => saveTemplateAction({ id: template?.id, name, description, items: payload }), { onSuccess: onClose })
            }
          >
            {pending ? 'Guardando…' : 'Guardar plantilla'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
