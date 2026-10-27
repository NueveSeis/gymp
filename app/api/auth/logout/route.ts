import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/session'

// Cierra la sesión (se usa cuando una cuenta fue desactivada)
export function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get('reason')
  const url = new URL('/login', request.url)
  if (reason) url.searchParams.set('reason', reason)
  const res = NextResponse.redirect(url)
  res.cookies.delete(SESSION_COOKIE)
  return res
}
