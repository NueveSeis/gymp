import { NextResponse, type NextRequest } from 'next/server'
import { homeFor, isStaff, SESSION_COOKIE, verifySession } from '@/lib/session'

// Redirecciones rápidas antes de renderizar (la verificación real de permisos
// se repite en cada página y server action).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value)

  if (pathname === '/login') {
    return session ? NextResponse.redirect(new URL(homeFor(session.role), request.url)) : NextResponse.next()
  }

  if (!session) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    if (request.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE)
    return res
  }

  if (pathname === '/') return NextResponse.redirect(new URL(homeFor(session.role), request.url))
  if (pathname.startsWith('/trainer') && !isStaff(session.role)) {
    return NextResponse.redirect(new URL('/client', request.url))
  }
  if (pathname.startsWith('/client') && session.role !== 'client') {
    return NextResponse.redirect(new URL('/trainer', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/trainer/:path*', '/client/:path*'],
}
