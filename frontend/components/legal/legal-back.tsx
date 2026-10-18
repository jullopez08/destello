"use client"

import { useRouter } from "next/navigation"
import { Icon } from "@/components/ui/icon"
import { PREV_PATH_KEY } from "@/components/ui/nav-memory"

/**
 * "Volver" en las páginas legales: en la app instalada no hay botón atrás del navegador.
 * Lleva a la página anterior dentro de Destello (nunca fuera); si no hay, a la presentación.
 */
export function LegalBack() {
  const router = useRouter()
  return (
    <button
      type="button"
      className="btn ghost sm legal-back"
      onClick={() => {
        let prev: string | null = null
        try {
          prev = sessionStorage.getItem(PREV_PATH_KEY)
        } catch {}
        router.push(prev && prev !== window.location.pathname ? prev : "/")
      }}
    >
      <Icon name="up" style={{ transform: "rotate(-90deg)" }} />
      Volver
    </button>
  )
}
