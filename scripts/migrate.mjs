// Aplica las migraciones SQL de /database/migrations en orden y lleva registro
// en la tabla `schema_migrations`. Es seguro ejecutarlo varias veces: si una
// columna/índice/tabla ya existe (p. ej. porque corriste el SQL a mano en
// phpMyAdmin) esa sentencia se omite.
//
// Uso:  npm run db:migrate          (lee DATABASE_URL de .env o del entorno)

import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomBytes } from 'node:crypto'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = join(ROOT, 'database', 'migrations')

// Errores que significan "ya estaba aplicado"
const ALREADY_APPLIED = new Set([
  'ER_DUP_FIELDNAME', // columna ya existe
  'ER_DUP_KEYNAME', // índice ya existe
  'ER_TABLE_EXISTS_ERROR',
  'ER_FK_DUP_NAME',
])

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = join(ROOT, file)
    if (existsSync(p)) {
      try {
        process.loadEnvFile(p)
      } catch {}
    }
  }
}

export function connectionOptions(url) {
  const u = new URL(url)
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
    ssl: u.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 15000,
    timezone: 'Z',
    multipleStatements: false,
  }
}

function splitStatements(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Crea el admin, o si ya existe le pone esa contraseña, rol admin y lo activa */
export async function setAdmin(conn, username, password) {
  const bcrypt = (await import('bcryptjs')).default
  const hash = await bcrypt.hash(password, 10)
  const [res] = await conn.query("UPDATE `users` SET `password` = ?, `role` = 'admin', `is_active` = TRUE WHERE `username` = ?", [
    hash,
    username,
  ])
  if (res.affectedRows > 0) return 'actualizado'
  await conn.query(
    'INSERT INTO `users` (`username`, `password`, `role`, `full_name`, `is_active`) VALUES (?, ?, ?, ?, TRUE)',
    [username, hash, 'admin', 'Administrador']
  )
  return 'creado'
}

async function bootstrapAdmin(conn) {
  const username = (process.env.ADMIN_USERNAME || 'admin').trim()
  const envPassword = process.env.ADMIN_PASSWORD?.trim()
  const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM `users`')

  if (Number(total) === 0) {
    const password = envPassword || randomBytes(9).toString('base64url')
    await setAdmin(conn, username, password)
    console.log(`[migrate] Base de datos vacía: se creó el usuario admin "${username}".`)
    if (!envPassword) console.log(`[migrate] Contraseña temporal: ${password}  (cámbiala al entrar)`)
    return
  }

  // Recuperar acceso desde Dokploy: ADMIN_RESET=true + ADMIN_USERNAME + ADMIN_PASSWORD
  if (process.env.ADMIN_RESET === 'true') {
    if (!envPassword) return console.warn('[migrate] ADMIN_RESET=true necesita ADMIN_PASSWORD')
    const result = await setAdmin(conn, username, envPassword)
    console.log(`[migrate] ADMIN_RESET: admin "${username}" ${result}. Quita ADMIN_RESET de las variables.`)
  }
}

export async function connect() {
  loadEnv()
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  const mysql = (await import('mysql2/promise')).default
  const conn = await mysql.createConnection(connectionOptions(url))
  await conn.query("SET time_zone = '+00:00'")
  return conn
}

export async function migrate() {
  const conn = await connect()
  try {
    await conn.query(
      'CREATE TABLE IF NOT EXISTS `schema_migrations` (`name` VARCHAR(191) NOT NULL PRIMARY KEY, `applied_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4'
    )
    const [rows] = await conn.query('SELECT `name` FROM `schema_migrations`')
    const applied = new Set(rows.map((r) => r.name))
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

    let count = 0
    for (const file of files) {
      if (applied.has(file)) continue
      const statements = splitStatements(await readFile(join(MIGRATIONS_DIR, file), 'utf8'))
      for (const statement of statements) {
        try {
          await conn.query(statement)
        } catch (e) {
          if (ALREADY_APPLIED.has(e.code)) continue
          throw new Error(`${file}: ${e.message}\n→ ${statement.slice(0, 160)}`)
        }
      }
      await conn.query('INSERT INTO `schema_migrations` (`name`) VALUES (?)', [file])
      console.log(`[migrate] aplicada ${file}`)
      count++
    }
    if (count === 0) console.log('[migrate] la base de datos ya está al día')
    await bootstrapAdmin(conn)
  } finally {
    await conn.end()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate().catch((e) => {
    console.error('[migrate] error:', e.message)
    process.exit(1)
  })
}
