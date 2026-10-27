'use client'

import { RotateCcw } from 'lucide-react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <div className="max-w-sm">
        <h1 className="text-xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted">
          No pudimos cargar esta página. Puede ser un problema momentáneo de conexión con la base de datos.
        </p>
        {error.digest && <p className="mt-2 font-mono text-xs text-subtle">Código: {error.digest}</p>}
        <button onClick={reset} className="btn btn-primary mt-6">
          <RotateCcw className="size-4" /> Reintentar
        </button>
      </div>
    </main>
  )
}
