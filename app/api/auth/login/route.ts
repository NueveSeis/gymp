import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { username } })

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'La cuenta se encuentra desactivada, comunícate con tu entrenador' }, { status: 403 })
    }

    const isHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')
    const isValid = isHash ? await bcrypt.compare(password, user.password) : user.password === password

    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    await setSession({
      id: user.id,
      username: user.username,
      role: user.role as 'admin' | 'trainer' | 'client',
      fullName: user.fullName,
      isActive: user.isActive,
    })

    const redirectTo = user.role === 'client' ? '/client' : '/trainer'
    return NextResponse.json({ success: true, redirectTo })

  } catch (e: any) {
    console.error('Login API error:', e)
    return NextResponse.json({ error: 'Error interno del servidor. Intenta nuevamente.' }, { status: 500 })
  }
}
