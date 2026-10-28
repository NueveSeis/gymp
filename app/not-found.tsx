import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-extrabold text-brand-fg">404</p>
        <h1 className="mt-3 text-xl font-semibold">Esta página no existe</h1>
        <p className="mt-1 text-sm text-muted">Puede que el enlace esté mal o que se haya eliminado.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Volver al inicio
        </Link>
      </div>
    </main>
  )
}
