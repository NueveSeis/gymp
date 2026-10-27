'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, UserPlus } from 'lucide-react'
import { saveClientAction } from '@/actions/users'
import { Modal } from '@/components/ui/modal'
import { useAction } from '@/lib/client-utils'

export type EditableClient = {
  id: number
  fullName: string | null
  username: string
  phone: string | null
  goal: string | null
  notes: string | null
}

export function ClientFormModal({
  open,
  onClose,
  client,
  goToDetail = false,
}: {
  open: boolean
  onClose: () => void
  client?: EditableClient | null
  goToDetail?: boolean
}) {
  const router = useRouter()
  const [pending, runAction] = useAction()
  const editing = !!client

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar cliente' : 'Nuevo cliente'} description={editing ? `@${client.username}` : 'Crea su acceso para que vea sus rutinas'}>
      <form
        action={(fd) =>
          runAction(() => saveClientAction(fd), {
            onSuccess: (res) => {
              onClose()
              if (!editing && goToDetail && res.data?.id) router.push(`/trainer/clientes/${res.data.id}`)
            },
          })
        }
        className="space-y-4"
      >
        {editing && <input type="hidden" name="id" value={client.id} />}
        <div>
          <label className="label" htmlFor="cf-name">
            Nombre completo
          </label>
          <input id="cf-name" name="fullName" className="input" defaultValue={client?.fullName ?? ''} placeholder="Juan Pérez" maxLength={100} required autoFocus />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cf-user">
              Usuario
            </label>
            <input
              id="cf-user"
              name="username"
              className="input"
              defaultValue={client?.username ?? ''}
              placeholder="juanperez"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={50}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="cf-pass">
              {editing ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <input
              id="cf-pass"
              name="password"
              type="text"
              className="input"
              placeholder={editing ? 'Dejar vacío para no cambiar' : 'Mínimo 4 caracteres'}
              autoComplete="new-password"
              minLength={4}
              required={!editing}
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="cf-phone">
              Teléfono
            </label>
            <input id="cf-phone" name="phone" type="tel" className="input" defaultValue={client?.phone ?? ''} placeholder="opcional" maxLength={30} />
          </div>
          <div>
            <label className="label" htmlFor="cf-goal">
              Objetivo
            </label>
            <input id="cf-goal" name="goal" className="input" defaultValue={client?.goal ?? ''} placeholder="Ej. bajar 5 kg, ganar fuerza" maxLength={255} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="cf-notes">
            Notas privadas
          </label>
          <textarea id="cf-notes" name="notes" className="input" defaultValue={client?.notes ?? ''} placeholder="Lesiones, condiciones, preferencias… (solo las ve el entrenador)" />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function NewClientButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Nuevo cliente
      </button>
      <ClientFormModal open={open} onClose={() => setOpen(false)} goToDetail />
    </>
  )
}

export function EditClientButton({ client }: { client: EditableClient }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="btn btn-secondary" onClick={() => setOpen(true)}>
        <Pencil className="size-4" /> Editar
      </button>
      <ClientFormModal open={open} onClose={() => setOpen(false)} client={client} />
    </>
  )
}
