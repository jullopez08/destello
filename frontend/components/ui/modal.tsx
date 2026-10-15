"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "./icon"

// Ventana del diseño: encabezado y pie fijos, cuerpo con scroll. onSubmit
// devuelve una promesa; si lanza, el mensaje se muestra dentro de la ventana.
export function Modal({
  title,
  sub,
  children,
  submit = "Guardar",
  danger = false,
  wide = false,
  hideCancel = false,
  onClose,
  onSubmit,
}: {
  title: string
  sub?: React.ReactNode
  children: React.ReactNode
  submit?: string
  danger?: boolean
  wide?: boolean
  hideCancel?: boolean
  onClose: () => void
  onSubmit: () => Promise<void> | void
}) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Con la ventana abierta, la página de atrás no se mueve: así no hay doble
  // scroll ni queda un hueco al deslizar en el celular.
  useEffect(() => {
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = "hidden"
    return () => {
      html.style.overflow = before
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    const first = formRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea",
    )
    const t = window.setTimeout(() => first?.focus(), 30)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.clearTimeout(t)
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await onSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form ref={formRef} className={`modal${wide ? " wide" : ""}`} onSubmit={handleSubmit} noValidate role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            <h2>{title}</h2>
            {sub ? <p className="muted small" style={{ marginTop: 6 }}>{sub}</p> : null}
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </header>
        <div className="body">
          {children}
          {error ? <div className="err" role="alert">{error}</div> : null}
        </div>
        <footer>
          {hideCancel ? null : (
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancelar
            </button>
          )}
          <button type="submit" className={`btn ${danger ? "danger" : "primary"}`} disabled={busy}>
            {busy ? "Guardando…" : submit}
          </button>
        </footer>
      </form>
    </div>
  )
}

// Error de validación del formulario: se lanza dentro de onSubmit.
export class FormError extends Error {}
