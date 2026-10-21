"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, BUSINESS_REJECTED_EVENT, SESSION_EXPIRED_EVENT, TERMS_REQUIRED_EVENT } from "./api"
import { applyPalette } from "./palettes"

export type Role = "SUPER_ADMIN" | "ADMIN"

export interface SessionUser {
  id: string
  email: string
  name: string
  roles: Role[]
  organizationId: string | null
  organizationName: string | null
  palette: string | null
  logoUrl: string | null
  termsAcceptedAt: string | null
  /** "¿Atiendes clientes en mesas?" (enciende mesas y meseros) */
  servesTables: boolean
  /** "¿Qué preparas sobre todo?": comida (dibujos de platos) o postres y panes */
  makesMeals: boolean
  /** Inscrita por la página y esperando la aprobación del super admin */
  approvalPending: boolean
  /** El super admin la marcó "No es real": la cuenta queda en pausa con sus datos */
  rejected: boolean
  /** Cuándo terminó o saltó la guía del panel; null = se le muestra */
  tourCompletedAt: string | null
  /** Secciones cuya tarjeta de primera vez ya cerró */
  seenTips: string[]
}

// Versión de los términos que acepta la dueña: la fecha "Última actualización"
// de /terminos y /privacidad. Cambiarla no obliga a aceptar de nuevo; solo
// queda registrada la que se aceptó.
export const CURRENT_TERMS_VERSION = "2026-10-11"

type Status = "loading" | "anonymous" | "authenticated"

interface SessionValue {
  status: Status
  user: SessionUser | null
  expired: boolean
  needsTerms: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
  acceptTerms: () => Promise<void>
  setUser: (update: (u: SessionUser) => SessionUser) => void
}

const SessionContext = createContext<SessionValue | null>(null)

export const isSuperAdmin = (u: SessionUser | null) => !!u?.roles.includes("SUPER_ADMIN")

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading")
  const [user, setUserState] = useState<SessionUser | null>(null)
  const [expired, setExpired] = useState(false)
  const [termsFlag, setTermsFlag] = useState(false)

  const signIn = useCallback((u: SessionUser, expiresAt: number) => {
    setUserState(u)
    setStatus("authenticated")
    setExpired(false)
    applyPalette(u.palette)
    // Cierra la sesión en el navegador cuando vence el token.
    const ms = expiresAt - Date.now()
    if (ms > 0 && ms < 2 ** 31) window.setTimeout(() => window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT)), ms)
  }, [])

  useEffect(() => {
    api<{ user: SessionUser; expiresAt: number }>("/auth/me")
      .then(({ user: u, expiresAt }) => signIn(u, expiresAt))
      .catch(() => setStatus("anonymous"))

    const onExpired = () => {
      setUserState((current) => {
        if (current) setExpired(true)
        return null
      })
      setStatus("anonymous")
      applyPalette(null)
    }
    const onTerms = () => setTermsFlag(true)
    const onRejected = () => setUserState((current) => (current ? { ...current, rejected: true } : current))
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    window.addEventListener(TERMS_REQUIRED_EVENT, onTerms)
    window.addEventListener(BUSINESS_REJECTED_EVENT, onRejected)
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
      window.removeEventListener(TERMS_REQUIRED_EVENT, onTerms)
      window.removeEventListener(BUSINESS_REJECTED_EVENT, onRejected)
    }
  }, [signIn])

  const login = useCallback(
    async (email: string, password: string) => {
      const { user: u, expiresAt } = await api<{ user: SessionUser; expiresAt: number }>("/auth/login", {
        method: "POST",
        body: { email, password },
      })
      setTermsFlag(false)
      signIn(u, expiresAt)
      return u
    },
    [signIn],
  )

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" })
    } finally {
      setUserState(null)
      setStatus("anonymous")
      setExpired(false)
      applyPalette(null)
    }
  }, [])

  const acceptTerms = useCallback(async () => {
    const { user: u } = await api<{ user: SessionUser }>("/auth/accept-terms", { method: "POST", body: { terms_version: CURRENT_TERMS_VERSION } })
    setUserState(u)
    setTermsFlag(false)
  }, [])

  const setUser = useCallback((update: (u: SessionUser) => SessionUser) => {
    setUserState((current) => {
      if (!current) return current
      const next = update(current)
      applyPalette(next.palette)
      return next
    })
  }, [])

  const needsTerms = !!user && !isSuperAdmin(user) && (!user.termsAcceptedAt || termsFlag)

  const value = useMemo(
    () => ({ status, user, expired, needsTerms, login, logout, acceptTerms, setUser }),
    [status, user, expired, needsTerms, login, logout, acceptTerms, setUser],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("useSession debe usarse dentro de SessionProvider")
  return value
}
