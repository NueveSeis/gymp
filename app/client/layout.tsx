import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getActiveAccount, requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { Brand, LogoutButton } from '@/components/brand'
import { BottomNav, TopNav, type NavItem } from '@/components/nav'
import { RestTimerProvider } from '@/components/rest-timer'

const NAV: NavItem[] = [
  { href: '/client', label: 'Hoy', icon: 'today', exact: true },
  { href: '/client/progreso', label: 'Progreso', icon: 'progress' },
  { href: '/client/perfil', label: 'Perfil', icon: 'profile' },
]

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageUser('client')
  const [settings, account] = await Promise.all([getSettings(), getActiveAccount(session.id)])
  if (!account) redirect('/api/auth/logout?reason=inactive')

  return (
    <RestTimerProvider>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link href="/client" className="min-w-0">
            <Brand name={settings.systemName} logo={settings.logo} />
          </Link>
          <TopNav items={NAV} />
          <LogoutButton compact />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-32 md:pb-16">{children}</main>
      <BottomNav items={NAV} />
    </RestTimerProvider>
  )
}
