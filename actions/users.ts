'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, ne } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { fail, parse, run, zId, zText, type ActionResult } from '@/lib/action'

const { users } = schema

const zUsername = z
  .string()
  .trim()
  .min(2, 'El usuario debe tener al menos 2 caracteres')
  .max(50)
  .regex(/^[\p{L}\p{N}._@-]+$/u, 'El usuario no puede tener espacios ni símbolos raros')

const zPassword = z.string().max(72)

const clientSchema = z.object({
  id: z.union([z.literal(''), zId]).optional(),
  fullName: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  username: zUsername,
  password: zPassword.optional().default(''),
  phone: zText(30),
  goal: zText(255),
  notes: zText(5000),
})

async function usernameTaken(username: string, exceptId?: number) {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(exceptId ? and(eq(users.username, username), ne(users.id, exceptId)) : eq(users.username, username))
    .limit(1)
  return !!row
}

export async function saveClientAction(formData: FormData): Promise<ActionResult<{ id: number }>> {
  return run<{ id: number }>(async () => {
    await requireActionUser('staff')
    const { id, password, ...data } = parse(clientSchema, Object.fromEntries(formData))
    if (await usernameTaken(data.username, id || undefined)) return fail('Ese nombre de usuario ya está en uso')

    if (!id) {
      if (password.length < 4) return fail('La contraseña debe tener al menos 4 caracteres')
      const [res] = await db
        .insert(users)
        .values({ ...data, role: 'client', password: await bcrypt.hash(password, 10) })
        .$returningId()
      revalidatePath('/trainer', 'layout')
      return { ok: true, data: { id: res.id }, message: 'Cliente creado' }
    }

    if (password && password.length < 4) return fail('La contraseña debe tener al menos 4 caracteres')
    const [res] = await db
      .update(users)
      .set({ ...data, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) })
      .where(and(eq(users.id, id), eq(users.role, 'client')))
    if (res.affectedRows === 0) return fail('Cliente no encontrado')
    revalidatePath('/trainer', 'layout')
    return { ok: true, data: { id }, message: password ? 'Cliente actualizado y contraseña cambiada' : 'Cliente actualizado' }
  })
}

export async function setUserActiveAction(id: number, isActive: boolean): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('staff')
    const userId = parse(zId, id)
    if (userId === session.id) return fail('No puedes desactivar tu propia cuenta')
    const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    if (!target) return fail('Usuario no encontrado')
    // Solo un admin puede activar/desactivar personal
    if (target.role !== 'client' && session.role !== 'admin') return fail('Solo un administrador puede hacer esto')
    await db.update(users).set({ isActive }).where(eq(users.id, userId))
    revalidatePath('/trainer', 'layout')
    return { ok: true, message: isActive ? 'Cuenta activada' : 'Cuenta desactivada' }
  })
}

const staffSchema = z.object({
  fullName: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  username: zUsername,
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(72),
  role: z.enum(['trainer', 'admin']),
})

export async function createStaffAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('admin')
    const data = parse(staffSchema, Object.fromEntries(formData))
    if (await usernameTaken(data.username)) return fail('Ese nombre de usuario ya está en uso')
    await db.insert(users).values({ ...data, password: await bcrypt.hash(data.password, 10) })
    revalidatePath('/trainer/ajustes')
    return { ok: true, message: data.role === 'admin' ? 'Administrador creado' : 'Entrenador creado' }
  })
}
