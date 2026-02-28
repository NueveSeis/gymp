import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { setSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export const runtime = 'nodejs'
export const maxDuration = 15 // segundos máximos para responder

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 })
    }

    // Timeout manual de 10 segundos para la consulta a la BD
    const userPromise = prisma.user.findUnique({ where: { username } })
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 10000)
    )

    const user = await Promise.race([userPromise, timeoutPromise])

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Cuenta desactivada. Contacta a tu entrenador.' }, { status: 403 })
    }

    const isHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2y$')
    const isValid = isHash
      ? await bcrypt.compare(password, user.password)
      : user.password === password

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
    console.error('Login API error:', e?.message || e)

    if (e?.message === 'Database timeout') {
      return NextResponse.json(
        { error: 'La base de datos tardó demasiado. Intenta nuevamente.' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor: ' + (e?.message || 'desconocido') },
      { status: 500 }
    )
  }
}
