'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// In production (Docker), UPLOAD_DIR points to the mounted volume.
// In development, falls back to public/uploads inside the project.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-logo-${file.name.replace(/\s+/g, '_')}`;
  // Ensure directory exists (important for the volume mount)
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filepath = join(UPLOAD_DIR, filename);
  await writeFile(filepath, buffer);
  return `/api/uploads/${filename}`;
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
    const logoFile = formData.get('logo') as File | null;

    const newLocalLogoPath = await saveUploadedFile(logoFile);

    const updateData: any = { systemName, logoUrl };
    if (newLocalLogoPath) {
      updateData.localLogoPath = newLocalLogoPath;
    } else if (removeLogo) {
      updateData.localLogoPath = null;
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
