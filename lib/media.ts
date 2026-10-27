// Utilidades de medios (se usan en servidor y cliente)

/** Normaliza rutas antiguas (/uploads/x) al endpoint actual */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('/uploads/')) return `/api${path}`
  return path
}

export function exerciseImage(ex: { localImagePath: string | null; imageUrl: string | null }): string | null {
  return mediaUrl(ex.localImagePath) || ex.imageUrl || null
}

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

export function isDirectVideo(url: string | null | undefined): boolean {
  return !!url && /\.(mp4|webm|mov)(\?|$)/i.test(url)
}

export function hasVideo(ex: { localVideoPath?: string | null; videoUrl?: string | null }): boolean {
  return !!(ex.localVideoPath || ex.videoUrl)
}
