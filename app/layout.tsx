import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'GymPro',
  description: 'Rutinas, progreso y seguimiento para entrenadores y clientes',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GymPro' },
  icons: { apple: '/icons/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#0a0d14',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={inter.variable}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          richColors
          toastOptions={{ style: { background: 'var(--color-elevated)', border: '1px solid var(--color-line-strong)' } }}
        />
      </body>
    </html>
  )
}
