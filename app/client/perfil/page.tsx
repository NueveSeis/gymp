import type { Metadata } from 'next'
import { Smartphone, Target } from 'lucide-react'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { getClient } from '@/lib/queries'
import { Avatar, PageHeader } from '@/components/ui/basics'
import { LogoutButton } from '@/components/brand'
import { PasswordForm } from '@/components/password-form'
import { ThemeSelector } from '@/components/theme'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Mi perfil · ${systemName}` }
}

export default async function ProfilePage() {
  const session = await requirePageUser('client')
  const [client, settings] = await Promise.all([getClient(session.id), getSettings()])
  const name = client?.fullName || session.username

  return (
    <div className="space-y-4">
      <PageHeader title="Mi perfil" />
      <section className="card flex items-center gap-4 p-5">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{name}</p>
          <p className="text-sm text-muted">@{session.username}</p>
        </div>
        <LogoutButton />
      </section>

      {client?.goal && (
        <section className="card flex gap-3 p-5">
          <Target className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Mi objetivo</p>
            <p className="mt-1">{client.goal}</p>
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Apariencia</h2>
        <ThemeSelector />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold">Cambiar contraseña</h2>
        <PasswordForm />
      </section>

      <section className="card flex gap-3 p-5">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-brand-fg" />
        <div className="text-sm">
          <p className="font-semibold">Instala {settings.systemName} en tu celular</p>
          <p className="mt-1 text-muted">
            iPhone: toca <b>Compartir</b> → <b>Agregar a inicio</b>. Android: menú <b>⋮</b> → <b>Instalar app</b>. Se abrirá como
            una app, a pantalla completa.
          </p>
        </div>
      </section>
    </div>
  )
}
