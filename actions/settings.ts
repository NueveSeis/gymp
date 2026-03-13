'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile } from 'fs/promises'
import { join } from 'path'

async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-logo-${file.name.replace(/\s+/g, '_')}`;
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function getSettings() {
  let settings = await prisma.systemSetting.findFirst()
  if (!settings) {
    settings = await prisma.systemSetting.create({
      data: { systemName: 'GymPro' }
    })
  }
  return settings
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
