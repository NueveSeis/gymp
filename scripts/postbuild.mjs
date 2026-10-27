// Completa el build standalone (Next no lo hace solo):
// - copia public/ y .next/static/
// - copia sharp completo: el trazado omite sus librerías nativas (libvips)
// - convierte en relativos los symlinks de .next/node_modules para que sigan
//   funcionando al mover la carpeta (p. ej. dentro de la imagen Docker)
import { cpSync, existsSync, lstatSync, readdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const standalone = join(ROOT, '.next', 'standalone')

if (existsSync(standalone)) {
  cpSync(join(ROOT, 'public'), join(standalone, 'public'), { recursive: true })
  cpSync(join(ROOT, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })

  for (const pkg of ['sharp', '@img']) {
    const from = join(ROOT, 'node_modules', pkg)
    if (existsSync(from)) cpSync(from, join(standalone, 'node_modules', pkg), { recursive: true, dereference: true })
  }

  const externals = join(standalone, '.next', 'node_modules')
  if (process.platform !== 'win32' && existsSync(externals)) {
    for (const name of readdirSync(externals)) {
      const link = join(externals, name)
      if (!lstatSync(link).isSymbolicLink()) continue
      const target = resolve(externals, readlinkSync(link))
      const pkg = target.split(/node_modules[\\/]/).pop()
      const local = join(standalone, 'node_modules', pkg)
      rmSync(link)
      symlinkSync(relative(externals, existsSync(local) ? local : target), link)
    }
  }
  console.log('[postbuild] standalone listo (assets + sharp)')
}
