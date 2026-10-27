import 'server-only'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, stat, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

// En Docker/Dokploy UPLOAD_DIR apunta al volumen montado (no se pierde al redeployar)
export const UPLOAD_DIR = resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'))

export const UPLOAD_KINDS = {
  image: { maxBytes: 15 * 1024 * 1024, types: /^image\/(jpeg|png|webp|gif|avif|heic|heif)$/ },
  video: { maxBytes: 200 * 1024 * 1024, types: /^video\/(mp4|webm|quicktime)$/ },
} as const
export type UploadKind = keyof typeof UPLOAD_KINDS

const VIDEO_EXT: Record<string, string> = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' }

/** Ruta absoluta segura de un archivo subido (acepta nombres de la versión anterior) */
export function resolveUpload(name: string): string | null {
  if (!name || name.startsWith('.') || /[/\\\0]/.test(name) || name.includes('..')) return null
  const full = resolve(UPLOAD_DIR, name)
  return dirname(full) === UPLOAD_DIR ? full : null
}

class TooLarge extends Error {}

/** Guarda el cuerpo de la petición en disco sin cargarlo entero en memoria */
export async function saveUpload(body: ReadableStream<Uint8Array>, kind: UploadKind, contentType: string) {
  const rule = UPLOAD_KINDS[kind]
  if (!rule.types.test(contentType)) {
    throw new Error(kind === 'image' ? 'Formato de imagen no soportado' : 'Usa video MP4, WebM o MOV')
  }
  await mkdir(UPLOAD_DIR, { recursive: true })
  const id = `${Date.now()}-${randomBytes(5).toString('hex')}`
  const tmp = join(UPLOAD_DIR, `.${id}.part`)

  let received = 0
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length
      if (received > rule.maxBytes) cb(new TooLarge())
      else cb(null, chunk)
    },
  })

  try {
    await pipeline(Readable.fromWeb(body as never), limiter, createWriteStream(tmp))
  } catch (e) {
    await unlink(tmp).catch(() => {})
    if (e instanceof TooLarge) throw new Error(`El archivo supera ${Math.round(rule.maxBytes / 1024 / 1024)} MB`)
    throw e
  }

  if (kind === 'image') {
    // Redimensiona y convierte a WebP: imágenes 5-10x más ligeras
    const sharp = (await import('sharp')).default
    const name = `${id}.webp`
    try {
      await sharp(tmp, { failOn: 'error', animated: contentType === 'image/gif' })
        .rotate()
        .resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(join(UPLOAD_DIR, name))
    } catch {
      throw new Error('No se pudo procesar la imagen')
    } finally {
      await unlink(tmp).catch(() => {})
    }
    return `/api/uploads/${name}`
  }

  const name = `${id}${VIDEO_EXT[contentType] ?? '.mp4'}`
  await rename(tmp, join(UPLOAD_DIR, name))
  return `/api/uploads/${name}`
}

/** Borra un archivo subido a partir de su URL (/api/uploads/x o /uploads/x) */
export async function deleteUpload(url: string | null | undefined) {
  if (!url) return
  const name = url.replace(/^\/(api\/)?uploads\//, '')
  const full = resolveUpload(name)
  if (!full) return
  try {
    await stat(/*turbopackIgnore: true*/ full)
    await unlink(full)
  } catch {
    // ya no existe: nada que hacer
  }
}
