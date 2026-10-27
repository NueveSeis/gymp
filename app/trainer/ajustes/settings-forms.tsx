'use client'

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition } from 'react'
import { ImagePlus, Lock, Unlock, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { updateSettingsAction } from '@/actions/settings'
import { createStaffAction, setUserActiveAction } from '@/actions/users'
import { Avatar } from '@/components/ui/basics'
import { Modal } from '@/components/ui/modal'
import { uploadFile, useAction, useObjectUrl } from '@/lib/client-utils'
import { relativeTime } from '@/lib/dates'
import { mediaUrl } from '@/lib/media'
import type { AppSettings } from '@/lib/settings'

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const [pending, startTransition] = useTransition()
  const [local, setLocal] = useState(settings.localLogoPath)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState(settings.logoUrl ?? '')
  const filePreview = useObjectUrl(file)

  const preview = filePreview || mediaUrl(local) || url || '/icon.svg'

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        const path = file ? await uploadFile(file, 'image') : local
        fd.set('localLogoPath', path ?? '')
        fd.set('logoUrl', url)
        const res = await updateSettingsAction(fd)
        if (!res.ok) return void toast.error(res.error)
        setLocal(path)
        setFile(null)
        toast.success(res.message)
      } catch (err) {
        toast.error((err as Error).message)
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="st-name">
          Nombre del sistema
        </label>
        <input id="st-name" name="systemName" className="input" defaultValue={settings.systemName} maxLength={100} required />
      </div>
      <div className="flex items-center gap-4">
        <img src={preview} alt="" className="size-16 rounded-xl border border-line bg-surface-2 object-contain" />
        <div className="flex flex-wrap gap-2">
          <label className="btn btn-secondary btn-sm cursor-pointer">
            <ImagePlus className="size-4" /> Subir logo
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {(local || file) && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFile(null)
                setLocal(null)
              }}
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="st-url">
          …o URL de un logo externo
        </label>
        <input id="st-url" className="input" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}

type StaffRow = { id: number; username: string; fullName: string | null; role: 'admin' | 'trainer' | 'client'; isActive: boolean; lastLoginAt: Date | null }

export function StaffManager({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: number }) {
  const [open, setOpen] = useState(false)
  const [pending, runAction] = useAction()

  return (
    <>
      <ul className="mb-4 divide-y divide-line rounded-xl border border-line">
        {staff.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={s.fullName || s.username} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {s.fullName || s.username} {s.id === currentUserId && <span className="text-subtle">(tú)</span>}
              </p>
              <p className="text-xs text-subtle">
                @{s.username} · último acceso {relativeTime(s.lastLoginAt).toLowerCase()}
              </p>
            </div>
            <span className={s.role === 'admin' ? 'badge badge-yellow' : 'badge badge-blue'}>{s.role === 'admin' ? 'Admin' : 'Entrenador'}</span>
            {!s.isActive && <span className="badge badge-red">Inactivo</span>}
            {s.id !== currentUserId && (
              <button
                className="btn btn-ghost btn-icon"
                disabled={pending}
                onClick={() => runAction(() => setUserActiveAction(s.id, !s.isActive))}
                title={s.isActive ? 'Desactivar' : 'Activar'}
                aria-label={s.isActive ? 'Desactivar' : 'Activar'}
              >
                {s.isActive ? <Lock className="size-4" /> : <Unlock className="size-4" />}
              </button>
            )}
          </li>
        ))}
      </ul>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Agregar entrenador
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo miembro del equipo">
        <form action={(fd) => runAction(() => createStaffAction(fd), { onSuccess: () => setOpen(false) })} className="space-y-4">
          <div>
            <label className="label" htmlFor="sf-name">
              Nombre completo
            </label>
            <input id="sf-name" name="fullName" className="input" required maxLength={100} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="sf-user">
                Usuario
              </label>
              <input id="sf-user" name="username" className="input" autoCapitalize="none" required maxLength={50} />
            </div>
            <div>
              <label className="label" htmlFor="sf-pass">
                Contraseña
              </label>
              <input id="sf-pass" name="password" type="text" className="input" minLength={6} required autoComplete="new-password" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sf-role">
              Rol
            </label>
            <select id="sf-role" name="role" className="input" defaultValue="trainer">
              <option value="trainer">Entrenador — gestiona clientes, rutinas y ejercicios</option>
              <option value="admin">Administrador — además gestiona al equipo</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? 'Creando…' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
