'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { fail, parse, run, zId, zOptionalInt, zText, type ActionResult } from '@/lib/action'
import { routineItemSchema } from '@/lib/schemas'
import { addDays, isIsoDate } from '@/lib/dates'
import { clientsExist, exercisesExist, getDayItemsForCopy } from '@/lib/queries'

const { assignments, routineTemplates, routineTemplateItems } = schema

const MAX_ROWS = 600

const zDate = z.string().refine(isIsoDate, 'Fecha inválida')

const builderSchema = z.object({
  clientIds: z.array(zId).min(1, 'Elige al menos un cliente'),
  startDate: zDate,
  repeatWeeks: z.coerce.number().int().min(1).max(12).default(1),
  items: z.array(routineItemSchema).min(1, 'Agrega al menos un ejercicio').max(40),
  saveAsTemplate: zText(100),
})

function revalidateRoutines() {
  revalidatePath('/trainer', 'layout')
  revalidatePath('/client', 'layout')
}

async function nextSortOrder(clientIds: number[], dates: string[]) {
  const rows = await db
    .select({
      clientId: assignments.clientId,
      date: assignments.scheduledDate,
      max: sql<number>`MAX(${assignments.sortOrder})`.mapWith(Number),
    })
    .from(assignments)
    .where(and(inArray(assignments.clientId, clientIds), inArray(assignments.scheduledDate, dates)))
    .groupBy(assignments.clientId, assignments.scheduledDate)
  return new Map(rows.map((r) => [`${r.clientId}|${String(r.date)}`, Number(r.max) + 1]))
}

/** Asigna una rutina (varios ejercicios) a uno o varios clientes, opcionalmente cada semana */
export async function createRoutineAction(input: z.input<typeof builderSchema>): Promise<ActionResult<{ count: number }>> {
  return run<{ count: number }>(async () => {
    const session = await requireActionUser('staff')
    const data = parse(builderSchema, input)
    const dates = Array.from({ length: data.repeatWeeks }, (_, i) => addDays(data.startDate, i * 7))
    const total = data.clientIds.length * dates.length * data.items.length
    if (total > MAX_ROWS) return fail(`Son demasiadas asignaciones a la vez (${total}). Máximo ${MAX_ROWS}.`)

    const exerciseIds = data.items.map((i) => i.exerciseId)
    const [okClients, okExercises, offsets] = await Promise.all([
      clientsExist(data.clientIds),
      exercisesExist(exerciseIds),
      nextSortOrder(data.clientIds, dates),
    ])
    if (!okClients) return fail('Algún cliente no existe')
    if (!okExercises) return fail('Algún ejercicio ya no existe')

    const rows: (typeof assignments.$inferInsert)[] = []
    for (const clientId of data.clientIds) {
      for (const date of dates) {
        const base = offsets.get(`${clientId}|${date}`) ?? 0
        data.items.forEach((item, idx) => {
          rows.push({
            clientId,
            trainerId: session.id,
            exerciseId: item.exerciseId,
            scheduledDate: date,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
            trainerNotes: item.notes,
            sortOrder: base + idx,
          })
        })
      }
    }

    await db.transaction(async (tx) => {
      await tx.insert(assignments).values(rows)
      if (data.saveAsTemplate) {
        const [res] = await tx
          .insert(routineTemplates)
          .values({ name: data.saveAsTemplate, createdBy: session.id })
          .$returningId()
        await tx.insert(routineTemplateItems).values(
          data.items.map((item, idx) => ({
            templateId: res.id,
            exerciseId: item.exerciseId,
            sets: item.sets,
            reps: item.reps,
            restSeconds: item.restSeconds,
            notes: item.notes,
            sortOrder: idx,
          }))
        )
      }
    })
    revalidateRoutines()
    return { ok: true, data: { count: rows.length }, message: `Rutina asignada (${rows.length} ejercicios)` }
  })
}

const updateSchema = z.object({
  id: zId,
  scheduledDate: zDate,
  sets: z.coerce.number().int().min(1).max(50),
  reps: z.coerce.number().int().min(1).max(500),
  restSeconds: zOptionalInt(0, 900),
  trainerNotes: zText(255),
  exerciseId: zId,
})

export async function updateAssignmentAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    const { id, ...data } = parse(updateSchema, Object.fromEntries(formData))
    if (!(await exercisesExist([data.exerciseId]))) return fail('Ese ejercicio ya no existe')
    await db.update(assignments).set(data).where(eq(assignments.id, id))
    revalidateRoutines()
    return { ok: true, message: 'Ejercicio actualizado' }
  })
}

export async function deleteAssignmentAction(id: number): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    await db.delete(assignments).where(eq(assignments.id, parse(zId, id)))
    revalidateRoutines()
    return { ok: true, message: 'Ejercicio eliminado de la rutina' }
  })
}

export async function deleteDayAction(clientId: number, date: string): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    await db
      .delete(assignments)
      .where(and(eq(assignments.clientId, parse(zId, clientId)), eq(assignments.scheduledDate, parse(zDate, date))))
    revalidateRoutines()
    return { ok: true, message: 'Día eliminado' }
  })
}

const copySchema = z.object({
  fromClientId: zId,
  fromDate: zDate,
  toClientIds: z.array(zId).min(1, 'Elige al menos un cliente'),
  toDate: zDate,
  repeatWeeks: z.coerce.number().int().min(1).max(12).default(1),
})

/** Copia la rutina de un día a otra fecha y/o a otros clientes */
export async function copyDayAction(input: z.input<typeof copySchema>): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('staff')
    const data = parse(copySchema, input)
    const items = await getDayItemsForCopy(data.fromClientId, data.fromDate)
    if (items.length === 0) return fail('Ese día no tiene ejercicios')
    const dates = Array.from({ length: data.repeatWeeks }, (_, i) => addDays(data.toDate, i * 7))
    if (data.toClientIds.length * dates.length * items.length > MAX_ROWS) return fail('Demasiadas asignaciones a la vez')
    if (!(await clientsExist(data.toClientIds))) return fail('Algún cliente no existe')

    const offsets = await nextSortOrder(data.toClientIds, dates)
    const rows = data.toClientIds.flatMap((clientId) =>
      dates.flatMap((date) => {
        const base = offsets.get(`${clientId}|${date}`) ?? 0
        return items.map((item, idx) => ({
          clientId,
          trainerId: session.id,
          exerciseId: item.exerciseId,
          scheduledDate: date,
          sets: item.sets,
          reps: item.reps,
          restSeconds: item.restSeconds,
          trainerNotes: item.trainerNotes,
          sortOrder: base + idx,
        }))
      })
    )
    await db.insert(assignments).values(rows)
    revalidateRoutines()
    return { ok: true, message: `Rutina copiada (${rows.length} ejercicios)` }
  })
}
