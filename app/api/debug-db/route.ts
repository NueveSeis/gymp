import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Intentar una consulta ultra simple
    const result = await prisma.$queryRaw`SELECT 1 as connected`
    return NextResponse.json({ 
      status: 'Connected successfully', 
      db_url_exists: !!process.env.DATABASE_URL,
      result 
    })
  } catch (e: any) {
    return NextResponse.json({ 
      status: 'Error', 
      message: e.message,
      code: e.code,
      meta: e.meta,
      db_url_exists: !!process.env.DATABASE_URL
    }, { status: 500 })
  }
}
