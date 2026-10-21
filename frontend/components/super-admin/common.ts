// Tipos y utilidades compartidas del panel de la super admin.

export interface Plan { id: string; name: string; price: number; durationDays: number; isTrial: boolean; active: boolean }
export interface Payment { id: string; amount: number; status: string; method: "WOMPI" | "CASH"; note: string | null; createdAt: string }
export interface Subscription {
  id: string
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"
  currentPeriodEnd: string
  discountPercent: number
  discountExpiresAt: string | null
  plan: Plan
  payments?: Payment[]
}
export interface Owner { id: string; name: string; email: string; active: boolean; termsAcceptedAt: string | null }
export interface Organization {
  id: string
  name: string
  slug: string
  active: boolean
  palette: string
  /** "¿Atiende clientes en mesas?" */
  servesTables: boolean
  /** Inscrita sola con SIGNUP_MODE=review: espera "Aprobar" */
  approvalPending: boolean
  /** Cuándo comprobaste que es real (null = por verificar) y cuándo la marcaste "No es real" (queda en pausa) */
  verifiedAt: string | null
  rejectedAt: string | null
  /** Instagram o Google Maps que dio al inscribirse, y si subió su carta en PDF (para comprobar que es real) */
  findUs: string | null
  menu: { name: string; size: number; uploadedAt: string } | null
  createdAt: string
  dataDeletionScheduledAt: string | null
  subscription: Subscription | null
  users: Owner[]
}

export const STATUS: Record<string, [string, string]> = {
  TRIALING: ["lilac", "En prueba"],
  ACTIVE: ["good", "Activa"],
  PAST_DUE: ["warn", "Pago pendiente"],
  CANCELLED: ["bad", "Cancelada"],
}
export const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
