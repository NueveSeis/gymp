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

export default function Navbar({ username, role }: { username: string; role: string }) {
  const roleLabel = role === 'trainer' ? '🏋️ Entrenador' : role === 'admin' ? '⚙️ Admin' : '👤 Cliente'
  return (
    <nav className="navbar">
      <span className="navbar-brand">⚡ GymPro</span>
      <div className="navbar-user">
        <span>{roleLabel} — <strong>{username}</strong></span>
        <form action={logoutAction}>
          <LogoutBtn />
        </form>
      </div>
    </nav>
  )
}
