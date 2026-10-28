'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { fail, parse, run, zId, zRequired, zText, type ActionResult } from '@/lib/action'
import { routineItemSchema } from '@/lib/schemas'
import { exercisesExist } from '@/lib/queries'

const { routineTemplates, routineTemplateItems } = schema

const templateSchema = z.object({
  id: zId.optional(),
  name: zRequired('El nombre', 100),
  description: zText(255),
  items: z.array(routineItemSchema).min(1, 'Agrega al menos un ejercicio').max(40),
})

export async function saveTemplateAction(input: z.input<typeof templateSchema>): Promise<ActionResult> {
  return run(async () => {
    const session = await requireActionUser('staff')
    const { id, items, ...data } = parse(templateSchema, input)
    if (!(await exercisesExist(items.map((i) => i.exerciseId)))) return fail('Algún ejercicio ya no existe')

    await db.transaction(async (tx) => {
      let templateId = id
      if (templateId) {
        await tx.update(routineTemplates).set(data).where(eq(routineTemplates.id, templateId))
        await tx.delete(routineTemplateItems).where(eq(routineTemplateItems.templateId, templateId))
      } else {
        const [res] = await tx
          .insert(routineTemplates)
          .values({ ...data, createdBy: session.id })
          .$returningId()
        templateId = res.id
      }
      await tx.insert(routineTemplateItems).values(
        items.map((item, idx) => ({
          templateId: templateId!,
          exerciseId: item.exerciseId,
          sets: item.sets,
          reps: item.reps,
          restSeconds: item.restSeconds,
          notes: item.notes,
          sortOrder: idx,
        }))
      )
    })
    revalidatePath('/trainer', 'layout')
    return { ok: true, message: id ? 'Plantilla actualizada' : 'Plantilla creada' }
  })
}

export async function deleteTemplateAction(id: number): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    await db.delete(routineTemplates).where(eq(routineTemplates.id, parse(zId, id)))
    revalidatePath('/trainer', 'layout')
    return { ok: true, message: 'Plantilla eliminada' }
  })
}
