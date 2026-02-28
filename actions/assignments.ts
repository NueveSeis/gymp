'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getAssignments(clientId?: number, date?: string) {
  return prisma.assignment.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(date ? { scheduledDate: new Date(date) } : {}),
    },
    include: {
      exercise: true,
      client: { select: { id: true, fullName: true, username: true } },
    },
    orderBy: { scheduledDate: 'asc' },
  })
}

export async function createAssignment(formData: FormData) {
  const clientId = Number(formData.get('clientId'))
  const trainerId = Number(formData.get('trainerId'))
  const exerciseId = Number(formData.get('exerciseId'))
  const scheduledDate = new Date(formData.get('scheduledDate') as string)
  const sets = Number(formData.get('sets'))
  const reps = Number(formData.get('reps'))

  try {
    await prisma.assignment.create({
      data: { clientId, trainerId, exerciseId, scheduledDate, sets, reps },
    })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function updateAssignment(formData: FormData) {
  const id = Number(formData.get('id'))
  const sets = Number(formData.get('sets'))
  const reps = Number(formData.get('reps'))
  const scheduledDate = new Date(formData.get('scheduledDate') as string)

  try {
    await prisma.assignment.update({
      where: { id },
      data: { sets, reps, scheduledDate },
    })
    revalidatePath('/trainer')
    revalidatePath('/client')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function deleteAssignment(id: number) {
  try {
    await prisma.assignment.delete({ where: { id } })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
