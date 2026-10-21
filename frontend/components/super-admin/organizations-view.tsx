"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Modal, FormError } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { PALETTES } from "@/lib/palettes"
import { money } from "@/lib/kitchen/format"
import { Empty, Eyebrow, Field, Kpi, PageHead, useModal } from "@/components/kitchen/shared"
import type { Plan, Organization } from "./common"
import { STATUS, dateFmt, slugify } from "./common"
import { OrganizationPanel } from "./organization-panel"

// ── Empresas ──

export function OrganizationsView({ orgs, plans, reload }: { orgs: Organization[]; plans: Plan[]; reload: () => Promise<void> }) {
  const { open } = useModal()
  const [q, setQ] = useState("")
  // Cada cifra filtra la lista por ese estado; tocarla de nuevo (o "Empresas") muestra todas.
  const [only, setOnly] = useState<"all" | "ACTIVE" | "TRIALING" | "due" | "pending">("all")
  const toast = useToast()
  const due = (o: Organization) => o.subscription?.status === "PAST_DUE" || !o.active
  // Por revisar: inscrita en modo review (no entra) o en modo open sin verificar aún (entra y trabaja normal).
  const toCheck = (o: Organization) => o.approvalPending || (!o.verifiedAt && !o.rejectedAt)
  const pending = orgs.filter(toCheck)
  const matches = (o: Organization) =>
    only === "all" || (only === "due" ? due(o) : only === "pending" ? toCheck(o) : o.subscription?.status === only)
  async function decide(o: Organization, real: boolean) {
    await api(`/organizations/${o.id}/${real ? "approve" : "reject"}`, { method: "POST" })
    await reload()
    toast(real ? `${o.name} quedó verificada` : `${o.name} quedó en pausa`)
  }
  const list = orgs.filter((o) => matches(o) && (!q || `${o.name} ${o.slug} ${o.users.map((u) => u.email).join(" ")}`.toLowerCase().includes(q.toLowerCase())))
  const count = (s: string) => orgs.filter((o) => o.subscription?.status === s).length
  const pick = (f: typeof only) => () => setOnly(only === f ? "all" : f)

  return (
    <>
      <PageHead title="Empresas" sub="Las pastelerías, panaderías y cocinas que usan Destello.">
        <button className="btn primary" onClick={() => open(<OrganizationForm plans={plans} reload={reload} />)} disabled={!plans.length}>
          <Icon name="plus" />
          Nueva empresa
        </button>
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi v={orgs.length} l="Empresas" s="Ver todas" c="c-accent" onClick={() => setOnly("all")} on={only === "all"} />
        <Kpi v={count("ACTIVE")} l="Activas pagando" c="c-mint" onClick={pick("ACTIVE")} on={only === "ACTIVE"} />
        <Kpi v={count("TRIALING")} l="En prueba" c="c-lilac" onClick={pick("TRIALING")} on={only === "TRIALING"} />
        <Kpi v={orgs.filter(due).length} l="Con pago pendiente o bloqueadas" c="c-peach" onClick={pick("due")} on={only === "due"} />
      </div>
      {pending.length ? (
        <button type="button" className="callout c-lilac small pending-callout" onClick={pick("pending")}>
          {pending.length === 1 ? "1 negocio inscrito espera que lo verifiques" : `${pending.length} negocios inscritos esperan que los verifiques`} ›
        </button>
      ) : null}
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="search" placeholder="Buscar por nombre o correo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar empresa" />
      </div>
      {list.length ? (
        <div className="tbl">
          <table>
            <thead>
              <tr><th>Empresa</th><th>Dueña</th><th>Plan</th><th>Estado</th><th>Vence</th><th></th></tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const s = o.subscription
                const [tone, label] = s ? STATUS[s.status] : ["", "Sin plan"]
                const owner = o.users[0]
                return (
                  <tr key={o.id} className="click" tabIndex={0} onClick={() => open(<OrganizationPanel org={o} plans={plans} reload={reload} />)} onKeyDown={(e) => e.key === "Enter" && open(<OrganizationPanel org={o} plans={plans} reload={reload} />)}>
                    <td>
                      <div className="row nowrap">
                        <span className="swatch" style={{ background: PALETTES.find((p) => p.id === o.palette)?.swatch }} />
                        <div>
                          <b>{o.name}</b>
                          <div className="small muted">{o.slug}{o.servesTables ? " · Con mesas" : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="small">
                      {owner ? (
                        <>
                          {owner.name}
                          <div className="muted">{owner.email}</div>
                          {!owner.termsAcceptedAt ? <span className="chip warn" style={{ marginTop: 4 }}>Sin aceptar términos</span> : null}
                        </>
                      ) : (
                        <span className="muted">Sin dueña</span>
                      )}
                    </td>
                    <td className="small">{s?.plan.name ?? "—"}</td>
                    <td>
                      <span className={`chip ${tone}`}>{label}</span>
                      {!o.active ? <div className="small" style={{ color: "var(--cherry)", marginTop: 4 }}>Bloqueada</div> : null}
                      {o.approvalPending ? <span className="chip warn" style={{ marginTop: 4 }}>En revisión</span>
                        : o.rejectedAt ? <span className="chip bad" style={{ marginTop: 4 }}>No es real</span>
                        : !o.verifiedAt ? <span className="chip warn" style={{ marginTop: 4 }}>Por verificar</span> : null}
                      {o.findUs || o.menu ? (
                        <div className="small row" style={{ marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                          {o.findUs ? <a href={o.findUs} target="_blank" rel="noopener noreferrer">{o.findUs.includes("instagram.com") ? "Instagram" : "Google Maps"} ↗</a> : null}
                          {o.menu ? <a href={`/api/organizations/${o.id}/menu`}>Carta (PDF)</a> : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="small num">{s ? dateFmt(s.currentPeriodEnd) : "—"}</td>
                    <td>
                      {toCheck(o) || o.rejectedAt ? (
                        <div className="row nowrap" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="btn primary sm" onClick={() => decide(o, true).catch((err) => toast(errorMessage(err)))}>{o.approvalPending ? "Aprobar" : "Verificar"}</button>
                          {o.rejectedAt ? null : <button type="button" className="btn ghost sm" onClick={() => decide(o, false).catch((err) => toast(errorMessage(err)))}>No es real</button>}
                        </div>
                      ) : (
                        <span className="btn ghost sm">Ver</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{orgs.length ? "Ninguna empresa coincide." : "Aún no hay empresas. Crea la primera."}</Empty>
      )}
    </>
  )
}

export function OrganizationForm({ plans, reload }: { plans: Plan[]; reload: () => Promise<void> }) {
  const { close } = useModal()
  const toast = useToast()
  const activePlans = plans.filter((p) => p.active)
  const [f, setF] = useState({ name: "", slug: "", servesTables: false, planId: activePlans.find((p) => p.isTrial)?.id ?? activePlans[0]?.id ?? "", palette: "vainilla", ownerName: "", ownerEmail: "", ownerPassword: "" })
  const [slugTouched, setSlugTouched] = useState(false)
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))

  return (
    <Modal
      title="Nueva empresa"
      sub="Se crea la empresa, su plan y la cuenta de la dueña. La dueña acepta los términos en su primer ingreso."
      wide
      submit="Crear empresa"
      onClose={close}
      onSubmit={async () => {
        if (!f.name.trim() || !f.slug) throw new FormError("Escribe el nombre y el identificador.")
        if (!f.ownerName.trim() || !f.ownerEmail.trim()) throw new FormError("Escribe el nombre y el correo de la dueña.")
        if (f.ownerPassword.length < 8) throw new FormError("La contraseña inicial debe tener al menos 8 caracteres.")
        await api("/organizations", { method: "POST", body: { ...f, name: f.name.trim(), ownerName: f.ownerName.trim(), ownerEmail: f.ownerEmail.trim() } })
        await reload()
        toast("Empresa creada")
        close()
      }}
    >
      <div className="fields">
        <Field label="Nombre del negocio">
          <input value={f.name} onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} placeholder="Ej. Pastelería Dulce Hogar" required />
        </Field>
        <Field label="Identificador" hint="Minúsculas, números y guiones.">
          <input value={f.slug} onChange={(e) => { setSlugTouched(true); set({ slug: slugify(e.target.value) }) }} required />
        </Field>
        <Field label="¿Atiende clientes en mesas?">
          <select value={f.servesTables ? "si" : "no"} onChange={(e) => set({ servesTables: e.target.value === "si" })}>
            <option value="no">No</option>
            <option value="si">Sí</option>
          </select>
        </Field>
        <Field label="Plan">
          <select value={f.planId} onChange={(e) => set({ planId: e.target.value })}>
            {activePlans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.isTrial ? " (prueba)" : ` · ${money(p.price / 100)}`}</option>)}
          </select>
        </Field>
        <Field label="Paleta inicial">
          <select value={f.palette} onChange={(e) => set({ palette: e.target.value })}>
            {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>
      <Eyebrow>La dueña</Eyebrow>
      <div className="fields">
        <Field label="Nombre"><input value={f.ownerName} onChange={(e) => set({ ownerName: e.target.value })} required /></Field>
        <Field label="Correo"><input type="email" value={f.ownerEmail} onChange={(e) => set({ ownerEmail: e.target.value })} required /></Field>
        <Field label="Contraseña inicial" hint="Compártela por un canal seguro; ella la puede cambiar en Configuración.">
          <input type="text" autoComplete="off" value={f.ownerPassword} onChange={(e) => set({ ownerPassword: e.target.value })} required />
        </Field>
      </div>
    </Modal>
  )
}
