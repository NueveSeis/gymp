'use client'

import { useRef } from 'react'
import { changePasswordAction } from '@/actions/auth'
import { useAction } from '@/lib/client-utils'

export function PasswordForm() {
  const [pending, runAction] = useAction()
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={ref}
      action={(fd) => runAction(() => changePasswordAction(fd), { onSuccess: () => ref.current?.reset() })}
      className="space-y-3"
    >
      <div>
        <label className="label" htmlFor="pw-current">
          Contraseña actual
        </label>
        <input id="pw-current" name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="pw-next">
            Nueva contraseña
          </label>
          <input id="pw-next" name="next" type="password" className="input" autoComplete="new-password" minLength={6} required />
        </div>
        <div>
          <label className="label" htmlFor="pw-confirm">
            Repite la nueva
          </label>
          <input id="pw-confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={6} required />
        </div>
      </div>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Cambiar contraseña'}
      </button>
    </form>
  )
}
