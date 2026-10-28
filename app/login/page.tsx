/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { ThemeToggle } from '@/components/theme'
import { LoginForm } from './login-form'

export async function generateMetadata(): Promise<Metadata> {
  const { systemName } = await getSettings()
  return { title: `Iniciar sesión · ${systemName}` }
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const [{ systemName, logo }, params] = await Promise.all([getSettings(), searchParams])
  const inactive = params.reason === 'inactive'

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(59_130_246/0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgb(34_211_238/0.10),transparent_50%)]" />
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo || '/icon.svg'} alt="" className="mb-4 size-16 rounded-2xl object-contain shadow-lg shadow-brand/20" />
          <h1 className="bg-gradient-to-r from-brand-fg to-accent bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            {systemName}
          </h1>
          <p className="mt-1.5 text-sm text-muted">Tu entrenamiento, organizado.</p>
        </div>
        <div className="card p-6 shadow-2xl shadow-black/40 light:shadow-slate-900/10">
          {inactive && (
            <p className="mb-4 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn-fg">
              Tu cuenta fue desactivada. Habla con tu entrenador.
            </p>
          )}
          <LoginForm />
        </div>
      </div>
    </main>
  )
}
