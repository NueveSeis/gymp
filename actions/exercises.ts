'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile } from 'fs/promises'
import { join } from 'path'

// Helper function to save files to public/uploads
async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);
  return `/uploads/${filename}`;
}

export async function getExercises() {
  return prisma.exercise.findMany({ orderBy: { name: 'asc' } })
}

export async function createExercise(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const imageUrl = formData.get('imageUrl') as string
  const videoUrl = formData.get('videoUrl') as string

  const imageFile = formData.get('image') as File | null;
  const videoFile = formData.get('video') as File | null;

  try {
    const localImagePath = await saveUploadedFile(imageFile);
    const localVideoPath = await saveUploadedFile(videoFile);

    await prisma.exercise.create({
      data: { name, description, imageUrl, videoUrl, localImagePath, localVideoPath },
    })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateExercise(formData: FormData) {
  const id = Number(formData.get('id'))
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const imageUrl = formData.get('imageUrl') as string
  const videoUrl = formData.get('videoUrl') as string
  
  const removeImage = formData.get('remove_image') === 'true'
  const removeVideo = formData.get('remove_video') === 'true'

  const imageFile = formData.get('image') as File | null;
  const videoFile = formData.get('video') as File | null;

  try {
    const newLocalImagePath = await saveUploadedFile(imageFile);
    const newLocalVideoPath = await saveUploadedFile(videoFile);

    const updateData: any = { name, description, imageUrl, videoUrl };
    if (newLocalImagePath) updateData.localImagePath = newLocalImagePath;
    else if (removeImage) updateData.localImagePath = null;

    if (newLocalVideoPath) updateData.localVideoPath = newLocalVideoPath;
    else if (removeVideo) updateData.localVideoPath = null;

    await prisma.exercise.update({
      where: { id },
      data: updateData,
    })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteExercise(id: number) {
  try {
    await prisma.exercise.delete({ where: { id } })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
