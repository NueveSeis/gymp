'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { fail, parse, run, zId, zRequired, zText, zUploadPath, zUrl, type ActionResult } from '@/lib/action'
import { deleteUpload } from '@/lib/uploads'

const { exercises, assignments } = schema

const exerciseSchema = z.object({
  id: z.union([z.literal(''), zId]).optional(),
  name: zRequired('El nombre', 100),
  muscleGroup: zText(100),
  description: zText(5000),
  imageUrl: zUrl,
  videoUrl: zUrl,
  localImagePath: zUploadPath,
  localVideoPath: zUploadPath,
})

export async function saveExerciseAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    const { id, ...data } = parse(exerciseSchema, Object.fromEntries(formData))
    const muscleGroup = data.muscleGroup ? data.muscleGroup.charAt(0).toUpperCase() + data.muscleGroup.slice(1) : null

    if (!id) {
      await db.insert(exercises).values({ ...data, muscleGroup })
      revalidatePath('/trainer', 'layout')
      return { ok: true, message: 'Ejercicio creado' }
    }

    const [current] = await db
      .select({ localImagePath: exercises.localImagePath, localVideoPath: exercises.localVideoPath })
      .from(exercises)
      .where(eq(exercises.id, id))
      .limit(1)
    if (!current) return fail('El ejercicio no existe')

    await db.update(exercises).set({ ...data, muscleGroup }).where(eq(exercises.id, id))
    // Borra del disco los archivos reemplazados o quitados
    if (current.localImagePath && current.localImagePath !== data.localImagePath) await deleteUpload(current.localImagePath)
    if (current.localVideoPath && current.localVideoPath !== data.localVideoPath) await deleteUpload(current.localVideoPath)
    revalidatePath('/trainer', 'layout')
    revalidatePath('/client', 'layout')
    return { ok: true, message: 'Ejercicio actualizado' }
  })
}

/** Borra el ejercicio; si ya tiene historial lo archiva para no perder el progreso de los clientes */
export async function deleteExerciseAction(id: number): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    const exerciseId = parse(zId, id)
    const [ex] = await db
      .select({ localImagePath: exercises.localImagePath, localVideoPath: exercises.localVideoPath })
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1)
    if (!ex) return fail('El ejercicio no existe')

    const used = await db.$count(assignments, eq(assignments.exerciseId, exerciseId))
    if (used > 0) {
      await db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, exerciseId))
      revalidatePath('/trainer', 'layout')
      return { ok: true, message: 'Ejercicio archivado (se conserva el historial de tus clientes)' }
    }
    await db.delete(exercises).where(eq(exercises.id, exerciseId))
    await deleteUpload(ex.localImagePath)
    await deleteUpload(ex.localVideoPath)
    revalidatePath('/trainer', 'layout')
    return { ok: true, message: 'Ejercicio eliminado' }
  })
}
