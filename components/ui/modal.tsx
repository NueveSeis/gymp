'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' }

/** Modal accesible basado en <dialog>. El contenido solo se monta cuando está abierto. */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={clsx('modal', sizes[size])}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby="modal-title"
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 id="modal-title" className="text-base font-semibold">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button type="button" className="btn btn-ghost btn-icon -mr-2 -mt-1" onClick={onClose} aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3 pb-safe">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

type ConfirmProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  pending?: boolean
  tone?: 'danger' | 'primary'
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Eliminar', pending, tone = 'danger' }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={clsx('btn', tone === 'danger' ? 'btn-danger' : 'btn-primary')}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Procesando…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted">{message}</div>
    </Modal>
  )
}
