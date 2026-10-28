import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AppToaster } from '@/components/theme'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'GymPro',
  description: 'Rutinas, progreso y seguimiento para entrenadores y clientes',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GymPro' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0d14' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme lo pone el script antes de pintar (por eso suppressHydrationWarning)
    <html lang="es-MX" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <AppToaster />
      </body>
    </html>
  )
}
