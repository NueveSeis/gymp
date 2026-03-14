import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'

// Determine the upload directory:
// In production (Docker), UPLOAD_DIR env var points to the mounted volume path.
// In development, falls back to public/uploads inside the project.
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    // Sanitize path to prevent directory traversal
    const filename = pathSegments
      .map((s) => s.replace(/\.\./g, ''))
      .join('/')

    const filePath = join(UPLOAD_DIR, filename)

    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    const fileBuffer = await readFile(filePath)
    const ext = extname(filename).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24h cache
      },
    })
  } catch (error) {
    console.error('Error serving upload:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
