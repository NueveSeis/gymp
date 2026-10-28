import { sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Health check para Dokploy/Docker. `?live=1` no consulta la base (liveness).
// No expone detalles internos.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has('live')) return Response.json({ status: 'ok' })
  const started = Date.now()
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ])
    return Response.json({ status: 'ok', db: 'ok', latencyMs: Date.now() - started })
  } catch {
    return Response.json({ status: 'degraded', db: 'error' }, { status: 503 })
  }
}
