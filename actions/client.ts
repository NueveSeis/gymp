'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { fail, parse, run, zId, zOptionalDecimal, zText, type ActionResult } from '@/lib/action'
import { isIsoDate, todayIso } from '@/lib/dates'

const { assignments, bodyMetrics } = schema

/** Marca / desmarca un ejercicio como hecho (solo el dueño de la rutina) */
export async function toggleCompleteAction(assignmentId: number, completed: boolean): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('client')
    const id = parse(zId, assignmentId)
    const [res] = await db
      .update(assignments)
      .set({ completed, completedAt: completed ? new Date() : null })
      .where(and(eq(assignments.id, id), eq(assignments.clientId, session.id)))
    if (res.affectedRows === 0) return fail('Ejercicio no encontrado')
    revalidatePath('/client', 'layout')
  })
}

const logSchema = z.object({
  id: zId,
  weightKg: zOptionalDecimal(0, 1000),
  clientNote: zText(255),
  markDone: z.boolean().optional(),
})

/** Registra el peso usado y una nota. Devuelve si fue récord personal. */
export async function logSetAction(input: z.input<typeof logSchema>): Promise<ActionResult<{ pr: boolean }>> {
  return run<{ pr: boolean }>(async () => {
    const session = await requireActionUser('client')
    const data = parse(logSchema, input)
    const [current] = await db
      .select({ exerciseId: assignments.exerciseId, completed: assignments.completed })
      .from(assignments)
      .where(and(eq(assignments.id, data.id), eq(assignments.clientId, session.id)))
      .limit(1)
    if (!current) return fail('Ejercicio no encontrado')

    let pr = false
    if (data.weightKg !== null && data.weightKg > 0) {
      const [best] = await db
        .select({ max: sql<number | null>`MAX(${assignments.weightKg})`.mapWith((v) => (v === null ? null : Number(v))) })
        .from(assignments)
        .where(
          and(
            eq(assignments.clientId, session.id),
            eq(assignments.exerciseId, current.exerciseId),
            ne(assignments.id, data.id)
          )
        )
      pr = best?.max !== null && best?.max !== undefined && data.weightKg > best.max
    }

    const markDone = data.markDone && !current.completed
    await db
      .update(assignments)
      .set({
        weightKg: data.weightKg,
        clientNote: data.clientNote,
        ...(markDone ? { completed: true, completedAt: new Date() } : {}),
      })
      .where(and(eq(assignments.id, data.id), eq(assignments.clientId, session.id)))
    revalidatePath('/client', 'layout')
    return { ok: true, data: { pr }, message: pr ? '¡Nuevo récord personal! 🏆' : 'Registro guardado' }
  })
}

const metricSchema = z
  .object({
    measuredOn: z.string().refine(isIsoDate, 'Fecha inválida'),
    weightKg: zOptionalDecimal(20, 400),
    bodyFatPct: zOptionalDecimal(2, 70),
    notes: zText(255),
  })
  .refine((d) => d.weightKg !== null || d.bodyFatPct !== null, { message: 'Escribe tu peso o % de grasa' })

export async function saveBodyMetricAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('client')
    const data = parse(metricSchema, Object.fromEntries(formData))
    if (data.measuredOn > todayIso()) return fail('La fecha no puede ser futura')
    await db
      .insert(bodyMetrics)
      .values({ userId: session.id, ...data })
      .onDuplicateKeyUpdate({ set: { weightKg: data.weightKg, bodyFatPct: data.bodyFatPct, notes: data.notes } })
    revalidatePath('/client', 'layout')
    return { ok: true, message: 'Medida guardada' }
  })
}

export async function deleteBodyMetricAction(id: number): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('client')
    await db.delete(bodyMetrics).where(and(eq(bodyMetrics.id, parse(zId, id)), eq(bodyMetrics.userId, session.id)))
    revalidatePath('/client', 'layout')
  })
}
