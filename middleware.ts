import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_ROUTES = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get('gym_session')

  // Si está en ruta pública y ya tiene sesión → redirigir al dashboard
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (session) {
      try {
        const user = JSON.parse(session.value)
        return NextResponse.redirect(
          new URL(user.role === 'client' ? '/client' : '/trainer', request.url)
        )
      } catch {}
    }
    return NextResponse.next()
  }

  // Rutas protegidas: requieren sesión
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar permisos por rol
  try {
    const user = JSON.parse(session.value)
    if (pathname.startsWith('/trainer') && user.role === 'client') {
      return NextResponse.redirect(new URL('/client', request.url))
    }
    if (pathname.startsWith('/client') && (user.role === 'trainer' || user.role === 'admin')) {
      return NextResponse.redirect(new URL('/trainer', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
