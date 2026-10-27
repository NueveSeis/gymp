'use client'

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, useTransition } from 'react'
import { Dumbbell, ImagePlus, Pencil, Plus, Search, Trash2, Video, X } from 'lucide-react'
import clsx from 'clsx'
import { toast } from 'sonner'
import { deleteExerciseAction, saveExerciseAction } from '@/actions/exercises'
import { ExerciseThumb, ExerciseVideo } from '@/components/media'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { uploadFile, useAction, useObjectUrl } from '@/lib/client-utils'
import { hasVideo, mediaUrl } from '@/lib/media'
import type { ExerciseRow } from '@/lib/queries'

export function NewExerciseButton({ groups }: { groups: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Nuevo ejercicio
      </button>
      {open && <ExerciseFormModal groups={groups} onClose={() => setOpen(false)} />}
    </>
  )
}

export function ExerciseLibrary({ exercises, groups }: { exercises: ExerciseRow[]; groups: string[] }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null>(null)
  const [editing, setEditing] = useState<ExerciseRow | null>(null)
  const [previewing, setPreviewing] = useState<ExerciseRow | null>(null)
  const [deleting, setDeleting] = useState<ExerciseRow | null>(null)
  const [pending, runAction] = useAction()

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises.filter(
      (e) => (!group || e.muscleGroup === group) && (!q || e.name.toLowerCase().includes(q) || (e.description ?? '').toLowerCase().includes(q))
    )
  }, [exercises, query, group])

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="relative sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <input className="input pl-9" placeholder="Buscar ejercicio" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {groups.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            <Chip active={!group} onClick={() => setGroup(null)}>
              Todos
            </Chip>
            {groups.map((g) => (
              <Chip key={g} active={group === g} onClick={() => setGroup(group === g ? null : g)}>
                {g}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center text-muted">
          <Dumbbell className="mb-3 size-8" />
          {exercises.length === 0 ? 'Tu biblioteca está vacía. Crea tu primer ejercicio.' : 'Ningún ejercicio coincide.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((ex) => (
            <article key={ex.id} className="card group flex flex-col overflow-hidden transition hover:border-line-strong">
              <button className="relative block text-left" onClick={() => setPreviewing(ex)} aria-label={`Ver ${ex.name}`}>
                <ExerciseThumb exercise={ex} className="aspect-[4/3] w-full" />
                {hasVideo(ex) && (
                  <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur">
                    <Video className="size-3.5" />
                  </span>
                )}
              </button>
              <div className="flex flex-1 flex-col p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-balance">{ex.name}</h3>
                {ex.muscleGroup && <span className="badge badge-blue mt-1.5 self-start">{ex.muscleGroup}</span>}
                <div className="mt-auto flex gap-1 pt-2">
                  <button className="btn btn-ghost btn-sm flex-1" onClick={() => setEditing(ex)}>
                    <Pencil className="size-3.5" /> Editar
                  </button>
                  <button className="btn btn-ghost btn-sm hover:text-danger-fg" onClick={() => setDeleting(ex)} aria-label={`Eliminar ${ex.name}`}>
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && <ExerciseFormModal exercise={editing} groups={groups} onClose={() => setEditing(null)} />}

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title={previewing?.name ?? ''} description={previewing?.muscleGroup ?? undefined} size="lg">
        {previewing && (
          <div className="space-y-4">
            {hasVideo(previewing) ? <ExerciseVideo exercise={previewing} /> : <ExerciseThumb exercise={previewing} className="aspect-video w-full rounded-xl" />}
            {previewing.description ? (
              <p className="text-sm whitespace-pre-line text-muted">{previewing.description}</p>
            ) : (
              <p className="text-sm text-subtle">Sin descripción.</p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Eliminar ejercicio"
        message={
          <>
            ¿Eliminar <b>{deleting?.name}</b>? Si ya está en rutinas de tus clientes se <b>archivará</b> para conservar su historial.
          </>
        }
        pending={pending}
        onConfirm={() => deleting && runAction(() => deleteExerciseAction(deleting.id), { onSuccess: () => setDeleting(null) })}
      />
    </>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition',
        active ? 'border-brand bg-brand/15 text-brand-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg'
      )}
    >
      {children}
    </button>
  )
}

function ExerciseFormModal({ exercise, groups, onClose }: { exercise?: ExerciseRow; groups: string[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<number | null>(null)
  const [imageLocal, setImageLocal] = useState(exercise?.localImagePath ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState(exercise?.imageUrl ?? '')
  const [videoLocal, setVideoLocal] = useState(exercise?.localVideoPath ?? null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState(exercise?.videoUrl ?? '')
  const filePreview = useObjectUrl(imageFile)
  const preview = filePreview || mediaUrl(imageLocal) || imageUrl || null

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        let img = imageLocal
        let vid = videoLocal
        if (imageFile) img = await uploadFile(imageFile, 'image')
        if (videoFile) {
          setProgress(0)
          vid = await uploadFile(videoFile, 'video', setProgress)
        }
        fd.set('localImagePath', img ?? '')
        fd.set('localVideoPath', vid ?? '')
        fd.set('imageUrl', imageUrl)
        fd.set('videoUrl', videoUrl)
        const res = await saveExerciseAction(fd)
        if (!res.ok) return void toast.error(res.error)
        toast.success(res.message)
        onClose()
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setProgress(null)
      }
    })
  }

  return (
    <Modal open onClose={onClose} title={exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        {exercise && <input type="hidden" name="id" value={exercise.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="ex-name">
              Nombre
            </label>
            <input id="ex-name" name="name" className="input" defaultValue={exercise?.name} placeholder="Press de banca" maxLength={100} required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="ex-group">
              Grupo muscular
            </label>
            <input id="ex-group" name="muscleGroup" list="muscle-groups" className="input" defaultValue={exercise?.muscleGroup ?? ''} placeholder="Pecho, Espalda, Pierna…" maxLength={100} autoComplete="off" />
            <datalist id="muscle-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="ex-desc">
            Descripción / técnica
          </label>
          <textarea id="ex-desc" name="description" className="input" defaultValue={exercise?.description ?? ''} placeholder="Cómo se ejecuta, errores comunes, respiración…" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="label">Imagen</legend>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-surface-2">
              {preview ? (
                <img src={preview} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-subtle">
                  <ImagePlus className="size-7" />
                </div>
              )}
              {(imageLocal || imageFile) && (
                <button
                  type="button"
                  className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/70 text-white"
                  onClick={() => {
                    setImageFile(null)
                    setImageLocal(null)
                  }}
                  aria-label="Quitar imagen"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <label className="btn btn-secondary btn-sm w-full cursor-pointer">
              <ImagePlus className="size-4" /> {imageLocal || imageFile ? 'Cambiar imagen' : 'Subir imagen'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </label>
            <input className="input" type="url" placeholder="…o pega una URL de imagen" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <p className="hint">Se convierte a WebP automáticamente (más ligera).</p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="label">Video</legend>
            <div className="grid aspect-video place-items-center rounded-xl border border-line bg-surface-2 px-3 text-center text-sm text-muted">
              {videoFile ? (
                <span className="truncate">📹 {videoFile.name}</span>
              ) : videoLocal ? (
                <span>Video subido ✓</span>
              ) : videoUrl ? (
                <span className="truncate">🔗 {videoUrl}</span>
              ) : (
                <Video className="size-7 text-subtle" />
              )}
            </div>
            <div className="flex gap-2">
              <label className="btn btn-secondary btn-sm flex-1 cursor-pointer">
                <Video className="size-4" /> {videoLocal || videoFile ? 'Cambiar video' : 'Subir video'}
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} />
              </label>
              {(videoLocal || videoFile) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setVideoFile(null)
                    setVideoLocal(null)
                  }}
                >
                  Quitar
                </button>
              )}
            </div>
            <input className="input" type="url" placeholder="…o enlace de YouTube" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            <p className="hint">MP4/WebM/MOV hasta 200 MB, o un enlace de YouTube.</p>
          </fieldset>
        </div>

        {progress !== null && (
          <div>
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Subiendo video…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-brand transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Guardando…' : exercise ? 'Guardar cambios' : 'Crear ejercicio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
