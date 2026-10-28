// Sesión firmada (JWT HS256). La versión anterior guardaba el usuario en un
// JSON plano dentro de la cookie: cualquiera podía editarla y hacerse admin.
// Este módulo no importa nada de Node para que también funcione en proxy.ts.
import { jwtVerify, SignJWT } from 'jose'
import type { Role } from './db/schema'

export const SESSION_COOKIE = 'gymp_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 días

export type Session = {
  id: number
  username: string
  name: string
  role: Role
}

let keyPromise: Promise<Uint8Array> | null = null

async function secretKey(): Promise<Uint8Array> {
  keyPromise ??= (async () => {
    const secret = process.env.SESSION_SECRET
    if (secret && secret.length >= 32) return new TextEncoder().encode(secret)
    if (process.env.NODE_ENV === 'production') {
      console.warn('[auth] SESSION_SECRET no definida (o < 32 caracteres). Se deriva una clave de DATABASE_URL; define SESSION_SECRET en Dokploy.')
    }
    // Respaldo: clave derivada de DATABASE_URL (también es secreta)
    const material = new TextEncoder().encode(`gymp-session:${process.env.DATABASE_URL ?? 'dev'}`)
    return new Uint8Array(await crypto.subtle.digest('SHA-256', material))
  })()
  return keyPromise
}

export async function signSession(session: Session): Promise<string> {
  return new SignJWT({ u: session.username, n: session.name, r: session.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(session.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(await secretKey())
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, await secretKey(), { algorithms: ['HS256'] })
    const id = Number(payload.sub)
    const role = payload.r as Role
    if (!Number.isInteger(id) || !['admin', 'trainer', 'client'].includes(role)) return null
    return { id, username: String(payload.u), name: String(payload.n || payload.u), role }
  } catch {
    return null
  }
}

export const isStaff = (role: Role) => role === 'admin' || role === 'trainer'
export const homeFor = (role: Role) => (role === 'client' ? '/client' : '/trainer')
