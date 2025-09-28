import React, { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  title: string
  message: React.ReactNode
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  autoFocusSelector?: string // default: first focusable button
  /** Visual style for the confirm action. 'primary' (default blue), 'danger' (outlined red pill), 'secondary' (neutral) or custom via confirmClassName */
  confirmStyle?: 'primary' | 'danger' | 'secondary'
  /** Custom class override for confirm button (takes precedence over confirmStyle) */
  confirmClassName?: string
}

/**
 * Accessible confirmation modal used across Employees, Students, Guardians pages.
 * Features:
 * - Initial focus (either provided selector or first focusable button)
 * - Focus trap (TAB / SHIFT+TAB loops inside)
 * - ESC closes (unless busy)
 * - Backdrop click closes (unless busy)
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  busy,
  onCancel,
  onConfirm,
  confirmLabel = 'Yes',
  cancelLabel = 'Cancel',
  autoFocusSelector,
  confirmStyle = 'primary',
  confirmClassName
}) => {
  const ref = useRef<HTMLDivElement | null>(null)

  const computedConfirmClass = React.useMemo(() => {
    if (confirmClassName) return confirmClassName
    switch (confirmStyle) {
      case 'danger':
        return 'btn btn-danger btn-sm'
      case 'secondary':
        return 'btn btn-secondary btn-sm'
      case 'primary':
      default:
        return 'btn-primary btn-sm'
    }
  }, [confirmStyle, confirmClassName])

  // Initial focus
  useEffect(() => {
    if (!ref.current) return
    const target = autoFocusSelector ? ref.current.querySelector<HTMLElement>(autoFocusSelector) : ref.current.querySelector<HTMLElement>('[data-first-focus]') || ref.current.querySelector<HTMLElement>('button:not([disabled])')
    setTimeout(() => target?.focus(), 0)
  }, [autoFocusSelector])

  // ESC + focus trap
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); if (!busy) onCancel() }
      if (e.key === 'Tab' && ref.current) {
        const focusables = Array.from(ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el => !el.hasAttribute('disabled'))
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey) {
          if (active === first || !ref.current.contains(active)) { e.preventDefault(); last.focus() }
        } else {
          if (active === last || !ref.current.contains(active)) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => { if (!busy) onCancel() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-generic-title" onClick={e => e.stopPropagation()} ref={ref}>
        <div className="modal-head">
          <strong id="confirm-generic-title">{title}</strong>
          <button type="button" className="chip-x" aria-label="Close" onClick={onCancel} disabled={busy}>×</button>
        </div>
        <div className="modal-body">
          {typeof message === 'string' ? <p>{message}</p> : message}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" data-first-focus className="btn btn-secondary btn-sm" disabled={busy} onClick={onCancel}>{cancelLabel}</button>
            <button type="button" className={computedConfirmClass} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
