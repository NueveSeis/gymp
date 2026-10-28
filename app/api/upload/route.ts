import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { isStaff } from '@/lib/session'
import { saveUpload, UPLOAD_KINDS, type UploadKind } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Subida directa (el archivo viaja como cuerpo crudo, no como FormData) para
// poder hacer streaming a disco sin límites de tamaño de las server actions.
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const kind = request.nextUrl.searchParams.get('kind') as UploadKind
  if (!(kind in UPLOAD_KINDS)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  const length = Number(request.headers.get('content-length') || 0)
  if (length > UPLOAD_KINDS[kind].maxBytes) {
    return NextResponse.json({ error: `El archivo supera ${UPLOAD_KINDS[kind].maxBytes / 1024 / 1024} MB` }, { status: 413 })
  }
  if (!request.body) return NextResponse.json({ error: 'Archivo vacío' }, { status: 400 })

  try {
    const url = await saveUpload(request.body, kind, contentType)
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'No se pudo subir el archivo' }, { status: 400 })
  }
}
