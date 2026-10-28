'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '@/lib/db'
import { requireActionUser } from '@/lib/auth'
import { parse, run, zRequired, zUploadPath, zUrl, type ActionResult } from '@/lib/action'
import { getSettings, invalidateSettings } from '@/lib/settings'
import { deleteUpload } from '@/lib/uploads'

const settingsSchema = z.object({
  systemName: zRequired('El nombre', 100),
  logoUrl: zUrl,
  localLogoPath: zUploadPath,
})

export async function updateSettingsAction(formData: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireActionUser('staff')
    const data = parse(settingsSchema, Object.fromEntries(formData))
    const current = await getSettings()
    await db.update(schema.systemSettings).set(data).where(eq(schema.systemSettings.id, current.id))
    if (current.localLogoPath && current.localLogoPath !== data.localLogoPath) await deleteUpload(current.localLogoPath)
    invalidateSettings()
    revalidatePath('/', 'layout')
    return { ok: true, message: 'Configuración guardada' }
  })
}
