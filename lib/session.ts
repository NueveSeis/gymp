import { cookies } from 'next/headers'

export type SessionUser = {
  id: number
  username: string
  role: 'admin' | 'trainer' | 'client'
  fullName: string | null
  isActive: boolean
}

const SESSION_COOKIE = 'gym_session'

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(SESSION_COOKIE)
  if (!cookie) return null
  try {
    return JSON.parse(cookie.value) as SessionUser
  } catch {
    return null
  }
}

export async function setSession(user: SessionUser) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, JSON.stringify(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
