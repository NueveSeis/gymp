import 'server-only'
import { z } from 'zod'
import { ActionError } from './auth'
import type { ActionResult } from './types'

export type { ActionResult }

/** Ejecuta una acción y convierte cualquier error en un mensaje legible */
export async function run<T>(fn: () => Promise<ActionResult<T> | void>): Promise<ActionResult<T>> {
  try {
    return (await fn()) ?? { ok: true }
  } catch (e) {
    return { ok: false, error: friendlyError(e) }
  }
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error }
}

export function parse<S extends z.ZodType>(schemaDef: S, input: unknown): z.infer<S> {
  const result = schemaDef.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new ActionError(issue?.message || 'Datos inválidos')
  }
  return result.data
}

export function formToObject(fd: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {}
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key)
    out[key] = key.endsWith('[]') ? all : all[0]
  }
  return out
}

function friendlyError(e: unknown): string {
  if (e instanceof ActionError) return e.message
  const err = e as { code?: string; message?: string; cause?: { code?: string } }
  const code = err?.code || err?.cause?.code
  if (code === 'ER_DUP_ENTRY') return 'Ya existe un registro con ese valor.'
  if (code === 'ER_ROW_IS_REFERENCED_2') return 'No se puede borrar porque tiene datos relacionados.'
  if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'PROTOCOL_CONNECTION_LOST')
    return 'No hay conexión con la base de datos. Intenta de nuevo.'
  if (code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE')
    return 'La base de datos no está actualizada. Ejecuta las migraciones (npm run db:migrate).'
  console.error('[action]', e)
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// ── Validadores comunes ──
export const zId = z.coerce.number().int().positive()
export const zText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)
export const zRequired = (label: string, max: number) =>
  z.string({ error: `${label} es obligatorio` }).trim().min(1, `${label} es obligatorio`).max(max, `${label}: máximo ${max} caracteres`)
export const zOptionalInt = (min: number, max: number) =>
  z
    .union([z.literal(''), z.coerce.number().int().min(min).max(max)])
    .nullable()
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v))
export const zOptionalDecimal = (min: number, max: number) =>
  z
    .union([z.literal(''), z.coerce.number().min(min).max(max)])
    .nullable()
    .optional()
    .transform((v) => (v === '' || v === undefined || v === null ? null : Math.round(v * 100) / 100))
export const zUrl = z
  .string()
  .trim()
  .max(255)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'La URL debe empezar con http:// o https://')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
export const zUploadPath = z
  .string()
  .trim()
  .max(255)
  .regex(/^(\/(api\/)?uploads\/[^/\\?#]+)?$/, 'Archivo inválido')
  .refine((v) => !v.includes('..'), 'Archivo inválido')
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null)
