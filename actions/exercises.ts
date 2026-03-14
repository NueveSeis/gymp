'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'

// In production (Docker), UPLOAD_DIR points to the mounted volume.
// In development, falls back to public/uploads inside the project.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

// Helper: save uploaded file to disk, returns its public URL path
async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null
  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`
  await mkdir(UPLOAD_DIR, { recursive: true })
  const filepath = join(UPLOAD_DIR, filename)
  await writeFile(filepath, buffer)
  return `/api/uploads/${filename}`
}

// Helper: delete a file from disk given its URL (/api/uploads/... or /uploads/...)
async function deleteUploadedFile(urlPath: string): Promise<void> {
  try {
    // Support both old (/uploads/) and new (/api/uploads/) URL formats
    const filename = urlPath.replace(/^\/(api\/)?uploads\//, '')
    if (!filename || filename.includes('..')) return // safety: prevent path traversal
    const filepath = join(UPLOAD_DIR, filename)
    await unlink(filepath)
  } catch {
    // File doesn't exist or already deleted — log silently, don't crash the operation
    console.warn(`Could not delete file from disk: ${urlPath}`)
  }
}

export async function getExercises() {
  return prisma.exercise.findMany({ orderBy: { name: 'asc' } })
}

export async function createExercise(formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const imageUrl = formData.get('imageUrl') as string
  const videoUrl = formData.get('videoUrl') as string
  const muscleGroup = formData.get('muscleGroup') as string

  const imageFile = formData.get('image') as File | null
  const videoFile = formData.get('video') as File | null

  try {
    const localImagePath = await saveUploadedFile(imageFile)
    const localVideoPath = await saveUploadedFile(videoFile)

    await prisma.exercise.create({
      data: { name, description, imageUrl, videoUrl, localImagePath, localVideoPath, muscleGroup },
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
  const muscleGroup = formData.get('muscleGroup') as string

  const removeImage = formData.get('remove_image') === 'true'
  const removeVideo = formData.get('remove_video') === 'true'

  const imageFile = formData.get('image') as File | null
  const videoFile = formData.get('video') as File | null

  try {
    // Fetch current file paths BEFORE updating so we can delete old files from disk
    const current = await prisma.exercise.findUnique({
      where: { id },
      select: { localImagePath: true, localVideoPath: true },
    })

    const newLocalImagePath = await saveUploadedFile(imageFile)
    const newLocalVideoPath = await saveUploadedFile(videoFile)

    const updateData: any = { name, description, imageUrl, videoUrl, muscleGroup }

    if (newLocalImagePath) {
      if (current?.localImagePath) await deleteUploadedFile(current.localImagePath) // delete old before replacing
      updateData.localImagePath = newLocalImagePath
    } else if (removeImage) {
      if (current?.localImagePath) await deleteUploadedFile(current.localImagePath) // explicit remove
      updateData.localImagePath = null
    }

    if (newLocalVideoPath) {
      if (current?.localVideoPath) await deleteUploadedFile(current.localVideoPath) // delete old before replacing
      updateData.localVideoPath = newLocalVideoPath
    } else if (removeVideo) {
      if (current?.localVideoPath) await deleteUploadedFile(current.localVideoPath) // explicit remove
      updateData.localVideoPath = null
    }

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
    // Fetch file paths BEFORE deleting the DB record
    const exercise = await prisma.exercise.findUnique({
      where: { id },
      select: { localImagePath: true, localVideoPath: true },
    })

    await prisma.exercise.delete({ where: { id } })

    // Delete physical files from disk after the DB record is removed
    if (exercise?.localImagePath) await deleteUploadedFile(exercise.localImagePath)
    if (exercise?.localVideoPath) await deleteUploadedFile(exercise.localVideoPath)

    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
