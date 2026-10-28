'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { Toaster } from 'sonner'
import { THEME_KEY, type ResolvedTheme, type ThemePreference } from '@/lib/theme'

const EVENT = 'gymp-theme-change'
const media = () => window.matchMedia('(prefers-color-scheme: light)')

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? (media().matches ? 'light' : 'dark') : pref
}

function apply(pref: ThemePreference) {
  document.documentElement.dataset.theme = resolve(pref)
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, pref)
  } catch {}
  apply(pref)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  const mq = media()
  const onMedia = () => {
    if (readPreference() === 'system') apply('system')
    cb()
  }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', cb)
  mq.addEventListener('change', onMedia)
  return () => {
    window.removeEventListener(EVENT, cb)
    window.removeEventListener('storage', cb)
    mq.removeEventListener('change', onMedia)
  }
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readPreference, () => 'system')
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
    () => 'dark'
  )
}

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

/** Botón compacto para las barras: alterna claro ↔ oscuro */
export function ThemeToggle() {
  const resolved = useResolvedTheme()
  const next: ResolvedTheme = resolved === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="btn btn-ghost btn-icon"
      onClick={() => setThemePreference(next)}
      aria-label={next === 'light' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={next === 'light' ? 'Modo claro' : 'Modo oscuro'}
    >
      {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

/** Selector completo (Claro / Oscuro / Sistema) para Perfil y Ajustes */
export function ThemeSelector() {
  const pref = useThemePreference()
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tema">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => setThemePreference(value)}
          className={clsx(
            'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition',
            pref === value ? 'border-brand bg-brand/10 text-brand-fg' : 'border-line text-muted hover:border-line-strong hover:text-fg'
          )}
        >
          <Icon className="size-5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/** Toaster que sigue el tema activo */
export function AppToaster() {
  const theme = useResolvedTheme()
  // Si el usuario eligió "Sistema", mantener data-theme sincronizado al volver a la pestaña
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && apply(readPreference())
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  return (
    <Toaster
      theme={theme}
      position="top-center"
      richColors
      toastOptions={{ style: { background: 'var(--color-elevated)', border: '1px solid var(--color-line-strong)', color: 'var(--color-fg)' } }}
    />
  )
}
