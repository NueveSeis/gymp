'use client'

import { logoutAction } from '@/actions/auth'
import { useFormStatus } from 'react-dom'

function LogoutBtn() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="btn btn-ghost btn-sm" disabled={pending}>
      {pending ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}

export default function Navbar({ username, role, systemName, logoUrl }: { username: string; role: string; systemName?: string; logoUrl?: string | null }) {
  const roleLabel = role === 'trainer' ? '🏋️ Entrenador' : role === 'admin' ? '⚙️ Admin' : '👤 Cliente'
  return (
    <nav className="navbar">
      <span className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {logoUrl ? <img src={logoUrl} alt={systemName || 'Logo'} style={{ height: '32px', objectFit: 'contain' }} /> : '⚡'}
        {systemName || 'GymPro'}
      </span>
      <div className="navbar-user">
        <span>{roleLabel} — <strong>{username}</strong></span>
        <form action={logoutAction}>
          <LogoutBtn />
        </form>
      </div>
    </nav>
  )
}
