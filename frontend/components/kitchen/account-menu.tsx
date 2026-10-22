"use client"

import { useEffect, useRef, useState } from "react"
import { initials } from "@/lib/kitchen/format"
import { useSession } from "@/lib/session"
import { useModal } from "./shared"
import { ChangePasswordForm } from "./forms/password-form"

/**
 * El círculo con las iniciales (Julieth, 2026-10-21: antes no hacía nada): abre la cuenta con "Cambiar
 * contraseña" y "Salir". Antes la contraseña estaba en Configuración → Tu cuenta.
 */
export function AccountMenu({ className = "" }: { className?: string }) {
  const { user, logout } = useSession()
  const { open } = useModal()
  const [shown, setShown] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shown) return
    const out = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setShown(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setShown(false) }
    document.addEventListener("pointerdown", out)
    document.addEventListener("keydown", esc)
    return () => {
      document.removeEventListener("pointerdown", out)
      document.removeEventListener("keydown", esc)
    }
  }, [shown])

  return (
    <div className={`account-menu ${className}`} ref={box}>
      <button type="button" className="avatar" aria-label="Tu cuenta" aria-expanded={shown} onClick={() => setShown((s) => !s)}>
        {initials(user?.name ?? "")}
      </button>
      {shown ? (
        <div className="account-pop card" role="menu">
          <b>{user?.name}</b>
          <p className="small muted">{user?.email}</p>
          <button type="button" role="menuitem" className="btn soft" onClick={() => { setShown(false); open(<ChangePasswordForm />) }}>
            Cambiar contraseña
          </button>
          <button type="button" role="menuitem" className="btn ghost" onClick={logout}>Salir</button>
          <p className="small muted">Si alguien entra a tu cuenta desde un aparato nuevo, te llega un correo.</p>
        </div>
      ) : null}
    </div>
  )
}
