/* eslint-disable @next/next/no-img-element */
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/actions/auth'

export function Brand({ name, logo }: { name: string; logo: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        <img src={logo} alt="" className="size-8 shrink-0 rounded-lg object-contain" />
      ) : (
        <img src="/icon.svg" alt="" className="size-8 shrink-0" />
      )}
      <span className="truncate bg-gradient-to-r from-brand-fg to-accent bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
        {name}
      </span>
    </span>
  )
}

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logoutAction}>
      <button type="submit" className="btn btn-ghost" aria-label="Cerrar sesión" title="Cerrar sesión">
        <LogOut className="size-4" />
        {!compact && <span>Salir</span>}
      </button>
    </form>
  )
}
