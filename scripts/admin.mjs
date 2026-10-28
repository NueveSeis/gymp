// Crea o restablece un usuario administrador.
// Uso (en la terminal del contenedor en Dokploy, o en local con .env):
//   node scripts/admin.mjs <usuario> <contraseña>

import { connect, setAdmin } from './migrate.mjs'

const [username, password] = process.argv.slice(2)
if (!username || !password) {
  console.error('Uso: node scripts/admin.mjs <usuario> <contraseña>')
  process.exit(1)
}
if (password.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres')
  process.exit(1)
}

try {
  const conn = await connect()
  try {
    const result = await setAdmin(conn, username.trim(), password)
    console.log(`Admin "${username.trim()}" ${result}. Ya puedes iniciar sesión.`)
  } finally {
    await conn.end()
  }
} catch (e) {
  console.error('No se pudo conectar o guardar:', e.message)
  process.exit(1)
}
