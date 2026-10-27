'use client'

import { useEffect, useMemo, useTransition } from 'react'
import { toast } from 'sonner'
import type { ActionResult } from './types'

type RunOptions<T> = {
  onSuccess?: (result: Extract<ActionResult<T>, { ok: true }>) => void
  /** Mensaje de éxito; `false` para no mostrar toast */
  success?: string | false
}

/** Ejecuta una server action en una transición y muestra el resultado como toast */
export function useAction() {
  const [pending, startTransition] = useTransition()
  function runAction<T>(fn: () => Promise<ActionResult<T>>, options: RunOptions<T> = {}) {
    startTransition(async () => {
      try {
        const res = await fn()
        if (res.ok) {
          const msg = options.success === false ? null : (options.success ?? res.message)
          if (msg) toast.success(msg)
          options.onSuccess?.(res)
        } else {
          toast.error(res.error)
        }
      } catch {
        toast.error('Se perdió la conexión. Revisa tu internet e intenta de nuevo.')
      }
    })
  }
  return [pending, runAction] as const
}

/** Sube un archivo al servidor (con progreso) y devuelve su URL pública */
export function uploadFile(file: File, kind: 'image' | 'video', onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/upload?kind=${kind}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      let body: { url?: string; error?: string } = {}
      try {
        body = JSON.parse(xhr.responseText)
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.url) resolve(body.url)
      else reject(new Error(body.error || 'No se pudo subir el archivo'))
    }
    xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
    xhr.send(file)
  })
}

/** URL temporal para previsualizar un archivo elegido (se libera sola) */
export function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])
  return url
}
