import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db, schema } from './db'
import type { Role } from './db/schema'
import { homeFor, isStaff, SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Session } from './session'

export type { Session }

export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
})

/**
 * "Secure" solo si la petición llegó por HTTPS. Detrás de Traefik (Dokploy) el
 * protocolo real viene en x-forwarded-proto; con un dominio http:// una cookie
 * Secure se descarta en silencio y el login regresa a /login.
 */
async function isHttpsRequest() {
  if (process.env.INSECURE_COOKIES === 'true') return false
  const proto = (await headers()).get('x-forwarded-proto')
  if (proto) return proto.split(',')[0].trim() === 'https'
  return process.env.NODE_ENV === 'production'
}

export async function startSession(session: Session) {
  const store = await cookies()
  store.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    secure: await isHttpsRequest(),
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function endSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  store.delete('gym_session') // cookie de la versión anterior
}

/** Para páginas: redirige si no hay sesión o el rol no corresponde */
export async function requirePageUser(allowed: 'staff' | 'client'): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  const ok = allowed === 'staff' ? isStaff(session.role) : session.role === 'client'
  if (!ok) redirect(homeFor(session.role))
  return session
}

/** Comprueba en la base que la cuenta siga activa (se ejecuta en paralelo en los layouts) */
export const getActiveAccount = cache(async (id: number) => {
  const [row] = await db
    .select({ isActive: schema.users.isActive, role: schema.users.role })
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1)
  return row && row.isActive ? row : null
})

export class ActionError extends Error {}

/** Para server actions: lanza ActionError si no está autorizado */
export async function requireActionUser(allowed: 'staff' | 'admin' | 'client' | 'any'): Promise<Session> {
  const session = await getSession()
  if (!session) throw new ActionError('Tu sesión expiró. Vuelve a iniciar sesión.')
  const roleOk: Record<typeof allowed, (r: Role) => boolean> = {
    any: () => true,
    client: (r) => r === 'client',
    staff: isStaff,
    admin: (r) => r === 'admin',
  }
  if (!roleOk[allowed](session.role)) throw new ActionError('No tienes permiso para esta acción.')
  // El personal puede modificar datos de otros: verificamos que siga activo
  if (allowed !== 'client' && isStaff(session.role)) {
    const account = await getActiveAccount(session.id)
    if (!account || !isStaff(account.role)) throw new ActionError('Tu cuenta no tiene acceso.')
  }
  return session
}
