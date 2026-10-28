'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { loginAction, type LoginState } from '@/actions/auth'

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, undefined)
  const [show, setShow] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger-fg">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="username" className="label">
          Usuario
        </label>
        <input
          id="username"
          name="username"
          className="input py-2.5"
          placeholder="tu usuario"
          defaultValue={state?.username}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoFocus
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? 'text' : 'password'}
            className="input py-2.5 pr-10"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-10 place-items-center text-subtle hover:text-fg"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
