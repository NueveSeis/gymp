// Arranque de producción (Dockerfile y `npm start`):
// 1. aplica migraciones pendientes (desactívalo con AUTO_MIGRATE=false)
// 2. levanta el servidor standalone de Next.js

import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// server.js hace chdir a su carpeta; fijamos rutas absolutas antes
process.env.UPLOAD_DIR ||= join(ROOT, 'uploads')
process.env.HOSTNAME = process.env.BIND_HOST || '0.0.0.0'
process.env.PORT ||= '3000'
process.env.NODE_ENV = 'production'

if (process.env.AUTO_MIGRATE !== 'false') {
  try {
    const { migrate } = await import('./migrate.mjs')
    await migrate()
  } catch (e) {
    console.error('[migrate] no se pudo migrar, la app arranca de todos modos:', e.message)
  }
}

const server = [join(ROOT, 'server.js'), join(ROOT, '.next', 'standalone', 'server.js')].find(existsSync)
if (!server) {
  console.error('No se encontró el build. Ejecuta `npm run build` primero.')
  process.exit(1)
}
await import(pathToFileURL(server).href)
