"use client"

import { useSyncExternalStore } from "react"

const noop = () => () => {}

// Cómo volver a entrar sin el enlace: el aparato ya quedó conectado, basta abrir /equipo (Julieth preguntó qué pasa
// si cierra la pestaña, 2026-10-19).
export function BackHint() {
  const url = useSyncExternalStore(noop, () => `${window.location.origin}/equipo`, () => "")
  if (!url) return null
  return (
    <p className="small muted back-hint">
      Para volver a entrar en este aparato abre <b className="num">{url}</b> o agrégala a la pantalla de inicio desde el menú del navegador.
    </p>
  )
}
