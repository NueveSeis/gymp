import 'server-only'
import mysql from 'mysql2/promise'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from './schema'

// Acepta la misma DATABASE_URL que usaba Prisma, p. ej.
// mysql://usuario:clave@host:3306/base?connection_limit=5
function poolOptions(url: string): mysql.PoolOptions {
  const u = new URL(url)
  const limit = Number(u.searchParams.get('connection_limit')) || 10
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    ssl: u.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: false } : undefined,
    connectionLimit: limit,
    maxIdle: Math.min(limit, 4),
    // Cerrar conexiones ociosas antes de que MySQL (wait_timeout) las corte
    idleTimeout: 30_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    connectTimeout: 10_000,
    waitForConnections: true,
    timezone: 'Z',
    supportBigNumbers: true,
  }
}

type DB = MySql2Database<typeof schema>

const globalForDb = globalThis as unknown as { __gympDb?: DB; __gympPool?: mysql.Pool }

function createDb(): DB {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  const pool = mysql.createPool(poolOptions(url))
  // Fechas en UTC también para NOW()/CURRENT_TIMESTAMP (igual que escribía Prisma)
  pool.pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+00:00'")
  })
  globalForDb.__gympPool = pool
  return drizzle(pool, { schema, mode: 'default' })
}

// Inicialización diferida: el build no necesita conexión a la base
export function getDb(): DB {
  globalForDb.__gympDb ??= createDb()
  return globalForDb.__gympDb
}

export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>
    const value = real[prop]
    return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(real) : value
  },
})

export { schema }
