import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'
import { resolveUpload } from '@/lib/uploads'

export const runtime = 'nodejs'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
}

// Sirve archivos del volumen de subidas con soporte de Range (necesario para
// que los videos se puedan adelantar y reproducir en iPhone/Safari).
export async function GET(request: NextRequest, ctx: RouteContext<'/api/uploads/[...path]'>) {
  const { path } = await ctx.params
  let name = path.length === 1 ? path[0] : ''
  try {
    name = decodeURIComponent(name)
  } catch {}
  const file = resolveUpload(name)
  if (!file) return new Response('Not found', { status: 404 })

  let size: number
  let mtime: Date
  try {
    const s = await stat(file)
    if (!s.isFile()) return new Response('Not found', { status: 404 })
    size = s.size
    mtime = s.mtime
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const ext = extname(name).toLowerCase()
  const headers = new Headers({
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // Los nombres son únicos: se pueden cachear "para siempre"
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
    'Last-Modified': mtime.toUTCString(),
    'X-Content-Type-Options': 'nosniff',
  })
  if (ext === '.svg') headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")

  const range = request.headers.get('range')
  const match = range?.match(/^bytes=(\d*)-(\d*)$/)
  if (match && (match[1] || match[2])) {
    let start = match[1] ? Number(match[1]) : size - Number(match[2])
    let end = match[1] && match[2] ? Number(match[2]) : size - 1
    start = Math.max(0, start)
    end = Math.min(end, size - 1)
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
    headers.set('Content-Length', String(end - start + 1))
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream
    return new Response(stream, { status: 206, headers })
  }

  headers.set('Content-Length', String(size))
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream
  return new Response(stream, { status: 200, headers })
}
