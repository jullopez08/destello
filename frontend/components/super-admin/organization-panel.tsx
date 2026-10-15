"use client"

import { useCallback, useEffect, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Modal, FormError } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { initials, money } from "@/lib/kitchen/format"
import { Empty, Field, Kpi, Seg, toNumber, useModal } from "@/components/kitchen/shared"
import type { Plan, Subscription, Owner, Organization } from "./common"
import { STATUS, dateFmt } from "./common"

// Ficha de una empresa: suscripción, controles manuales, dueña y borrado.
export function OrganizationPanel({ org, plans, reload }: { org: Organization; plans: Plan[]; reload: () => Promise<void> }) {
  const { close, open } = useModal()
  const toast = useToast()
  const [detail, setDetail] = useState<Subscription | null>(null)
  const [busy, setBusy] = useState(false)
  const owner = org.users[0]

  const load = useCallback(() => {
    api<Subscription>(`/subscriptions/${org.id}`).then(setDetail).catch((err) => toast(errorMessage(err), true))
  }, [org.id, toast])
  useEffect(load, [load])

  async function run(path: string, method: string, body: unknown, message: string) {
    setBusy(true)
    try {
      await api(path, { method, body })
      await reload()
      load()
      toast(message)
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setBusy(false)
    }
  }

  const s = detail ?? org.subscription
  const [tone, label] = s ? STATUS[s.status] : ["", "Sin plan"]

  return (
    <Modal title={org.name} sub={`${org.slug} · creada el ${dateFmt(org.createdAt)}`} wide submit="Listo" hideCancel onClose={close} onSubmit={close}>
      <div className="grid g4" style={{ gap: 10 }}>
        <Kpi v={<span className={`chip ${tone}`} style={{ fontSize: 14 }}>{label}</span>} l="Suscripción" c="c-lilac" />
        <Kpi v={s?.plan.name ?? "—"} l="Plan" s={s && !s.plan.isTrial ? money(s.plan.price / 100) : undefined} c="c-banana" />
        <Kpi v={s ? dateFmt(s.currentPeriodEnd) : "—"} l="Vence" c="c-sky" />
      </div>
      {!org.active ? (
        <div className="callout c-strawberry">
          <b>Bloqueada.</b> La dueña solo ve Suscripción.{" "}
          {org.dataDeletionScheduledAt ? `Sus datos se borran el ${dateFmt(org.dataDeletionScheduledAt)} si no se reactiva.` : ""}
        </div>
      ) : null}
      <div className="callout c-peach small">
        Wompi activa, extiende y desbloquea solo con cada pago aprobado. Usa estos controles solo para casos especiales.
      </div>

      <SubscriptionControls org={org} sub={s} plans={plans} busy={busy} run={run} />

      <div className="card">
        <h3>Pagos</h3>
        {s?.payments?.length ? (
          <div className="list">
            {s.payments.map((p) => (
              <div className="it" key={p.id}>
                <div>
                  <b className="num">{money(p.amount / 100)}</b>
                  <div className="small muted">{dateFmt(p.createdAt)} · {p.method === "CASH" ? "Efectivo" : "Wompi"}{p.note ? ` · ${p.note}` : ""}</div>
                </div>
                <span className={`chip ${p.status === "APPROVED" ? "good" : p.status === "PENDING" ? "warn" : "bad"}`}>{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Sin pagos.</Empty>
        )}
      </div>

      {owner ? <OwnerControls owner={owner} reload={reload} /> : null}

      <div className="card c-strawberry">
        <h3>Borrar empresa</h3>
        <p className="small">Borra todo: pedidos, inventario, recetas, pagos y la cuenta de la dueña. Si no está en prueba, primero cancela su suscripción.</p>
        <button type="button" className="btn danger sm" style={{ marginTop: 10, background: "var(--surface)" }} onClick={() => open(<DeleteOrganizationForm org={org} reload={reload} />)}>
          <Icon name="trash" />
          Borrar empresa
        </button>
      </div>
    </Modal>
  )
}

function SubscriptionControls({ org, sub, plans, busy, run }: { org: Organization; sub: Subscription | null; plans: Plan[]; busy: boolean; run: (path: string, method: string, body: unknown, message: string) => Promise<void> }) {
  const [planId, setPlanId] = useState(sub?.plan.id ?? "")
  const [status, setStatus] = useState<string>(sub?.status ?? "ACTIVE")
  const [days, setDays] = useState("7")
  const [discount, setDiscount] = useState(String(sub?.discountPercent ?? 0))
  const [cash, setCash] = useState("")
  const [note, setNote] = useState("")
  const base = `/subscriptions/${org.id}`

  return (
    <div className="grid g2" style={{ gap: 12 }}>
      <div className="card stack" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Plan</h3>
        <select className="search" style={{ maxWidth: "none" }} value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label="Plan">
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div><button type="button" className="btn soft sm" disabled={busy || planId === sub?.plan.id} onClick={() => run(`${base}/plan`, "PATCH", { planId }, "Plan cambiado")}>Cambiar plan</button></div>
        <p className="small muted">El período vuelve a contar desde hoy.</p>
      </div>
      <div className="card stack" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Estado</h3>
        <Seg name="status" value={status} onChange={setStatus} options={Object.entries(STATUS).map(([k, [, t]]) => [k, t] as [string, string])} />
        <div><button type="button" className="btn soft sm" disabled={busy || status === sub?.status} onClick={() => run(`${base}/status`, "PATCH", { status }, "Estado actualizado")}>Guardar estado</button></div>
        <p className="small muted">Activa desbloquea; pago pendiente o cancelada bloquean de inmediato.</p>
      </div>
      <div className="card stack" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Extender período</h3>
        <div className="row"><input className="search" style={{ maxWidth: 120 }} type="number" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Días" /> días</div>
        <div><button type="button" className="btn soft sm" disabled={busy || !Number.isInteger(toNumber(days))} onClick={() => run(`${base}/extend`, "PATCH", { days: toNumber(days) }, "Período actualizado")}>Aplicar</button></div>
      </div>
      <div className="card stack" style={{ gap: 10 }}>
        <h3 style={{ margin: 0 }}>Descuento</h3>
        <div className="row"><input className="search" style={{ maxWidth: 120 }} type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value)} aria-label="Descuento" /> %</div>
        <div><button type="button" className="btn soft sm" disabled={busy} onClick={() => run(`${base}/discount`, "PATCH", { discountPercent: Math.round(toNumber(discount) || 0) }, "Descuento guardado")}>Guardar</button></div>
      </div>
      <div className="card stack" style={{ gap: 10, gridColumn: "1 / -1" }}>
        <h3 style={{ margin: 0 }}>Registrar pago en efectivo</h3>
        <div className="fields">
          <Field label="Monto ($)"><input type="number" min="1" value={cash} onChange={(e) => setCash(e.target.value)} /></Field>
          <Field label="Nota"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Pago por transferencia directa" /></Field>
        </div>
        <div>
          <button type="button" className="btn soft sm" disabled={busy || !(toNumber(cash) > 0)} onClick={() => run(`${base}/cash-payment`, "POST", { amount: Math.round(toNumber(cash) * 100), note: note.trim() || undefined }, "Pago registrado")}>
            Registrar pago
          </button>
        </div>
        <p className="small muted">Activa la suscripción y la extiende un período del plan.</p>
      </div>
    </div>
  )
}

function OwnerControls({ owner, reload }: { owner: Owner; reload: () => Promise<void> }) {
  const toast = useToast()
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  async function update(body: Record<string, unknown>, message: string) {
    setBusy(true)
    try {
      await api(`/users/${owner.id}`, { method: "PATCH", body })
      await reload()
      toast(message)
      setPassword("")
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card stack" style={{ gap: 10 }}>
      <h3 style={{ margin: 0 }}>La dueña</h3>
      <div className="row between">
        <div className="row">
          <div className="avatar">{initials(owner.name)}</div>
          <div>
            <b>{owner.name}</b>
            <div className="small muted">{owner.email} · {owner.termsAcceptedAt ? `aceptó términos el ${dateFmt(owner.termsAcceptedAt)}` : "aún no acepta los términos"}</div>
          </div>
        </div>
        <button type="button" className="btn ghost sm" disabled={busy} onClick={() => update({ active: !owner.active }, owner.active ? "Cuenta desactivada" : "Cuenta activada")}>
          {owner.active ? "Desactivar cuenta" : "Activar cuenta"}
        </button>
      </div>
      <div className="row">
        <input className="search" type="text" autoComplete="off" placeholder="Nueva contraseña (mín. 8)" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Nueva contraseña" />
        <button type="button" className="btn soft sm" disabled={busy || password.length < 8} onClick={() => update({ password }, "Contraseña cambiada. Se cerraron sus sesiones.")}>Poner contraseña</button>
      </div>
      <p className="small muted">Mejor que ella use “¿Olvidaste tu contraseña?” en la entrada: le llega el link a su correo.</p>
    </div>
  )
}

function DeleteOrganizationForm({ org, reload }: { org: Organization; reload: () => Promise<void> }) {
  const { close } = useModal()
  const toast = useToast()
  const [typed, setTyped] = useState("")
  return (
    <Modal
      title="Borrar empresa"
      sub="Esto no se puede deshacer."
      submit="Borrar todo"
      danger
      onClose={close}
      onSubmit={async () => {
        if (typed.trim() !== org.name) throw new FormError("Escribe el nombre exacto de la empresa.")
        await api(`/organizations/${org.id}`, { method: "DELETE" })
        await reload()
        toast(`${org.name} borrada`)
        close()
      }}
    >
      <p>Para confirmar, escribe <b>{org.name}</b>.</p>
      <Field label="Nombre de la empresa"><input value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>
    </Modal>
  )
}
