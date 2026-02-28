'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function getUsers(role?: string) {
  return prisma.user.findMany({
    where: role ? { role: role as any } : undefined,
    select: { id: true, username: true, fullName: true, role: true, isActive: true },
    orderBy: { fullName: 'asc' },
  })
}

export async function createUser(formData: FormData) {
  const username = formData.get('username') as string
  const passwordRaw = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const role = (formData.get('role') as string) || 'client'

  try {
    const password = await bcrypt.hash(passwordRaw, 10)
    await prisma.user.create({
      data: { username, password, fullName, role: role as any },
    })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'El nombre de usuario ya existe' }
    return { error: e.message }
  }
}

export async function updateUser(formData: FormData) {
  const id = Number(formData.get('id'))
  const fullName = formData.get('fullName') as string
  const username = formData.get('username') as string
  const passwordRaw = formData.get('password') as string

  try {
    const updateData: any = { fullName, username }
    if (passwordRaw?.trim()) {
      updateData.password = await bcrypt.hash(passwordRaw, 10)
    }

    await prisma.user.update({
      where: { id },
      data: updateData,
    })
    revalidatePath('/trainer')
    return { success: true }
  } catch (e: any) {
    if (e.code === 'P2002') return { error: 'El nombre de usuario ya existe' }
    return { error: e.message }
  }
}

export async function toggleUserStatus(id: number, isActive: boolean) {
  await prisma.user.update({ where: { id }, data: { isActive } })
  revalidatePath('/trainer')
  return { success: true }
}
