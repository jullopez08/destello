"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

export const PREV_PATH_KEY = "destello:prev-path"

/** Recuerda la página anterior dentro de Destello (para "Volver" en las páginas legales). */
export function NavMemory() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current && last.current !== pathname) {
      try {
        sessionStorage.setItem(PREV_PATH_KEY, last.current)
      } catch {}
    }
    last.current = pathname
  }, [pathname])
  return null
}
