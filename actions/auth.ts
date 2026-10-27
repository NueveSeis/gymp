'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { endSession, requireActionUser, startSession } from '@/lib/auth'
import { homeFor } from '@/lib/session'
import { checkRateLimit, clearFailures, registerFailure } from '@/lib/rate-limit'
import { fail, parse, run, type ActionResult } from '@/lib/action'

const { users } = schema

export type LoginState = { error?: string; username?: string } | undefined

const isBcrypt = (hash: string) => /^\$2[aby]\$/.test(hash)

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!username || !password) return { error: 'Escribe tu usuario y contraseña.', username }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  const key = `${ip}:${username.toLowerCase()}`
  const limit = checkRateLimit(key)
  if (!limit.allowed) {
    return { error: `Demasiados intentos. Espera ${limit.retryInMin} min e inténtalo de nuevo.`, username }
  }

  let destination: string
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1)
    const valid = user
      ? isBcrypt(user.password)
        ? await bcrypt.compare(password, user.password)
        : user.password === password // contraseñas antiguas en texto plano
      : false

    if (!user || !valid) {
      registerFailure(key)
      return { error: 'Usuario o contraseña incorrectos.', username }
    }
    if (!user.isActive) {
      return { error: 'Tu cuenta está desactivada. Habla con tu entrenador.', username }
    }

    clearFailures(key)
    // Actualiza a hash seguro si la contraseña estaba en texto plano
    const update: Partial<typeof users.$inferInsert> = { lastLoginAt: new Date() }
    if (!isBcrypt(user.password)) update.password = await bcrypt.hash(password, 10)
    await db.update(users).set(update).where(eq(users.id, user.id))

    await startSession({ id: user.id, username: user.username, name: user.fullName || user.username, role: user.role })
    destination = homeFor(user.role)
  } catch (e) {
    console.error('[login]', e)
    return { error: 'No pudimos conectar con el servidor. Intenta de nuevo en unos segundos.', username }
  }
  redirect(destination)
}

export async function logoutAction() {
  await endSession()
  redirect('/login')
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Escribe tu contraseña actual'),
    next: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres').max(72),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: 'Las contraseñas nuevas no coinciden' })

export async function changePasswordAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('any')
    const data = parse(passwordSchema, Object.fromEntries(formData))
    const [user] = await db.select({ password: users.password }).from(users).where(eq(users.id, session.id)).limit(1)
    if (!user) return fail('Usuario no encontrado')
    const valid = isBcrypt(user.password) ? await bcrypt.compare(data.current, user.password) : user.password === data.current
    if (!valid) return fail('La contraseña actual no es correcta')
    await db.update(users).set({ password: await bcrypt.hash(data.next, 10) }).where(eq(users.id, session.id))
    return { ok: true, message: 'Contraseña actualizada' }
  })
}
