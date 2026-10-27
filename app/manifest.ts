import type { MetadataRoute } from 'next'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

// Permite "Agregar a pantalla de inicio" en el celular como si fuera una app
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { systemName } = await getSettings()
  return {
    name: systemName,
    short_name: systemName.slice(0, 12),
    description: 'Tus rutinas y progreso de entrenamiento',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0d14',
    theme_color: '#0a0d14',
    lang: 'es-MX',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
