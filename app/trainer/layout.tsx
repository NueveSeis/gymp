import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getActiveAccount, requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { Brand, LogoutButton } from '@/components/brand'
import { BottomNav, SidebarNav, type NavItem } from '@/components/nav'
import { Avatar } from '@/components/ui/basics'

const NAV: NavItem[] = [
  { href: '/trainer', label: 'Resumen', icon: 'dashboard', exact: true },
  { href: '/trainer/rutinas', label: 'Rutinas', icon: 'routines' },
  { href: '/trainer/clientes', label: 'Clientes', icon: 'clients' },
  { href: '/trainer/ejercicios', label: 'Ejercicios', icon: 'exercises' },
  { href: '/trainer/plantillas', label: 'Plantillas', icon: 'templates' },
  { href: '/trainer/ajustes', label: 'Ajustes', icon: 'settings' },
]
const MOBILE_NAV = NAV.filter((n) => n.icon !== 'templates')

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageUser('staff')
  const [settings, account] = await Promise.all([getSettings(), getActiveAccount(session.id)])
  if (!account) redirect('/api/auth/logout?reason=inactive')

  return (
    <div className="md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface/60 p-4 md:flex">
        <Link href="/trainer" className="mb-6 px-2 pt-1">
          <Brand name={settings.systemName} logo={settings.logo} />
        </Link>
        <SidebarNav items={NAV} />
        <div className="mt-auto flex items-center gap-2.5 border-t border-line px-1 pt-4">
          <Avatar name={session.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{session.name}</p>
            <p className="text-xs text-subtle">{session.role === 'admin' ? 'Administrador' : 'Entrenador'}</p>
          </div>
          <LogoutButton compact />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur md:hidden">
        <Link href="/trainer" className="min-w-0">
          <Brand name={settings.systemName} logo={settings.logo} />
        </Link>
        <LogoutButton compact />
      </header>

      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-12 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <BottomNav items={MOBILE_NAV} />
    </div>
  )
}
