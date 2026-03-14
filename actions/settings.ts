'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'

// In production (Docker), UPLOAD_DIR points to the mounted volume.
// In development, falls back to public/uploads inside the project.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-logo-${file.name.replace(/\s+/g, '_')}`
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filepath = join(UPLOAD_DIR, filename)
  await writeFile(filepath, buffer)
  return `/api/uploads/${filename}`
}

// Helper: delete a file from disk given its URL (/api/uploads/... or /uploads/...)
async function deleteUploadedFile(urlPath: string): Promise<void> {
  try {
    const filename = urlPath.replace(/^\/(api\/)?uploads\//, '')
    if (!filename || filename.includes('..')) return // safety: prevent path traversal
    const filepath = join(UPLOAD_DIR, filename)
    await unlink(filepath)
  } catch {
    console.warn(`Could not delete file from disk: ${urlPath}`)
  }
}

export async function getSettings() {
  try {
    let settings = await prisma.systemSetting.findFirst()
    if (!settings) {
      settings = await prisma.systemSetting.create({
        data: { systemName: 'GymPro' }
      })
    }
    return settings
  } catch (e) {
    console.error('Error fetching settings, using defaults:', e)
    return {
      id: 0,
      systemName: 'GymPro',
      logoUrl: null,
      localLogoPath: null
    }
  }
}

export async function updateSettings(formData: FormData) {
  try {
    const id = Number(formData.get('id'))
    const systemName = formData.get('systemName') as string
    const logoUrl = formData.get('logoUrl') as string

    const removeLogo = formData.get('remove_logo') === 'true'
    const logoFile = formData.get('logo') as File | null

    // Fetch current logo path BEFORE updating so we can delete old file
    const current = await prisma.systemSetting.findUnique({
      where: { id },
      select: { localLogoPath: true },
    })

    const newLocalLogoPath = await saveUploadedFile(logoFile)

    const updateData: any = { systemName, logoUrl }

    if (newLocalLogoPath) {
      if (current?.localLogoPath) await deleteUploadedFile(current.localLogoPath) // delete old logo
      updateData.localLogoPath = newLocalLogoPath
    } else if (removeLogo) {
      if (current?.localLogoPath) await deleteUploadedFile(current.localLogoPath) // explicit remove
      updateData.localLogoPath = null
    }

    await prisma.systemSetting.update({
      where: { id },
      data: updateData,
    })

    revalidatePath('/')
    revalidatePath('/trainer')
    revalidatePath('/client')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
