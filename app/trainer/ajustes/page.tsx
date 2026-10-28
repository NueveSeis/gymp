import type { Metadata } from 'next'
import { requirePageUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { listStaff } from '@/lib/queries'
import { PageHeader } from '@/components/ui/basics'
import { PasswordForm } from '@/components/password-form'
import { ThemeSelector } from '@/components/theme'
import { SettingsForm, StaffManager } from './settings-forms'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Ajustes · ${systemName}` }
}

export default async function SettingsPage() {
  const session = await requirePageUser('staff')
  const [settings, staff] = await Promise.all([getSettings(), session.role === 'admin' ? listStaff() : Promise.resolve([])])

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 font-semibold">Tu gimnasio</h2>
          <p className="mb-4 text-sm text-muted">Nombre y logo que ven tus clientes al entrar.</p>
          <SettingsForm settings={settings} />
        </section>
        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-1 font-semibold">Apariencia</h2>
            <p className="mb-4 text-sm text-muted">Se guarda en este dispositivo.</p>
            <ThemeSelector />
          </section>
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Mi contraseña</h2>
            <PasswordForm />
          </section>
        </div>
        {session.role === 'admin' && (
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-1 font-semibold">Equipo</h2>
            <p className="mb-4 text-sm text-muted">Entrenadores y administradores con acceso al panel.</p>
            <StaffManager staff={staff} currentUserId={session.id} />
          </section>
        )}
      </div>
    </>
  )
}
