'use client'

import { useFormStatus } from 'react-dom'
import { loginAction } from '@/actions/auth'
import { useState } from 'react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-primary btn-full" disabled={pending}>
      {pending ? 'Ingresando...' : 'Ingresar'}
    </button>
  )
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)

  async function handleAction(formData: FormData) {
    setError(null)
    const result = await loginAction(formData)
    if (result?.error) setError(result.error)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🏋️</div>
        <h1 className="login-title">GymPro</h1>
        <p className="login-subtitle">Plataforma de entrenamiento profesional</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form action={handleAction}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <input
              name="username"
              type="text"
              className="form-input"
              placeholder="Ingresa tu usuario"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Contraseña</label>
            <input
              name="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <SubmitButton />
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
            CUENTAS DE PRUEBA
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            🏋️ Entrenador: <strong>trainer1</strong> / <strong>pass123</strong>
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            👤 Cliente: <strong>client1</strong> / <strong>pass123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
