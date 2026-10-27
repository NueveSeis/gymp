import { z } from 'zod'
import { zId, zOptionalInt, zText } from './action'

/** Un ejercicio dentro de una rutina o plantilla */
export const routineItemSchema = z.object({
  exerciseId: zId,
  sets: z.coerce.number().int().min(1, 'Series: mínimo 1').max(50),
  reps: z.coerce.number().int().min(1, 'Reps: mínimo 1').max(500),
  restSeconds: zOptionalInt(0, 900),
  notes: zText(255),
})

export type RoutineItemInput = z.input<typeof routineItemSchema>
