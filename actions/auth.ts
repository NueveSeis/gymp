'use server'

import { prisma } from '@/lib/prisma'
import { setSession, clearSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Usuario y contraseña son requeridos' }
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      return { error: 'Credenciales incorrectas' }
    }

    if (!user.isActive) {
      return { error: 'La cuenta se encuentra desactivada, comunícate con tu entrenador' }
    }

    const isHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')
    const isValid = isHash ? await bcrypt.compare(password, user.password) : user.password === password

    if (!isValid) {
      return { error: 'Credenciales incorrectas' }
    }

    await setSession({
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'trainer' | 'client',
      fullName: user.fullName,
      isActive: user.isActive,
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return { error: 'Error al conectar con el servidor. Intenta nuevamente.' }
  }

  // redirect fuera del try/catch para que Next.js lo maneje como interrupción
  redirect(formData.get('username') === 'client' ? '/client' : '/trainer')
}

export async function logoutAction() {
  await clearSession()
  redirect('/login')
}
