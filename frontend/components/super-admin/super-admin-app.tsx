"use client"

import { useCallback, useEffect, useState } from "react"
import { Icon, type IconName } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { Modal, FormError } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { PALETTES } from "@/lib/palettes"
import { initials, money } from "@/lib/kitchen/format"
import { useHashPage } from "@/components/kitchen/kitchen-app"
import { Empty, Eyebrow, Field, Kpi, ModalHost, PageHead, Seg, toNumber, useModal } from "@/components/kitchen/shared"

// Panel de la super admin: todas las pastelerías, sus planes y sus pagos.

interface Plan { id: string; name: string; price: number; durationDays: number; isTrial: boolean; active: boolean }
interface Payment { id: string; amount: number; status: string; method: "WOMPI" | "CASH"; note: string | null; createdAt: string }
interface Subscription {
  id: string
  status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED"
  currentPeriodEnd: string
  discountPercent: number
  discountExpiresAt: string | null
  plan: Plan
  payments?: Payment[]
}
interface Owner { id: string; name: string; email: string; active: boolean; termsAcceptedAt: string | null }
interface Organization {
  id: string
  name: string
  slug: string
  active: boolean
  palette: string
  createdAt: string
  dataDeletionScheduledAt: string | null
  subscription: Subscription | null
  users: Owner[]
}

const STATUS: Record<string, [string, string]> = {
  TRIALING: ["lilac", "En prueba"],
  ACTIVE: ["good", "Activa"],
  PAST_DUE: ["warn", "Pago pendiente"],
  CANCELLED: ["bad", "Cancelada"],
}
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const PAGES: [string, string, IconName][] = [
  ["empresas", "Empresas", "empresas"],
  ["planes", "Planes", "planes"],
]

const fetchAll = () => Promise.all([api<Organization[]>("/organizations"), api<Plan[]>("/plans")])

export function SuperAdminApp() {
  const { user, logout } = useSession()
  const page = useHashPage(PAGES.map((p) => p[0]), "empresas")
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback(([o, p]: [Organization[], Plan[]]) => {
    setOrgs(o)
    setPlans(p)
    setError(null)
  }, [])
  const reload = useCallback(async () => {
    try {
      apply(await fetchAll())
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [apply])
  useEffect(() => {
    fetchAll()
      .then(apply)
      .catch((err) => setError(errorMessage(err)))
  }, [apply])

  return (
    <ModalHost>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <Cookie size={38} />
            <div>
              <b>Destello</b>
              <small>Super admin</small>
            </div>
          </div>
          <nav className="nav" aria-label="Secciones">
            {PAGES.map(([k, t, icon]) => (
              <a key={k} href={`#${k}`} className={k === page ? "on" : ""} aria-current={k === page ? "page" : undefined}>
                <Icon name={icon} />
                <span>{t}</span>
              </a>
            ))}
          </nav>
        </aside>
        <main className="main">
          <div className="top">
            <span className="pill"><i />Plataforma</span>
            <div className="who">
              <div style={{ textAlign: "right" }}>
                <b>{user?.name}</b>
                <div className="small muted">{user?.email}</div>
              </div>
              <div className="avatar">{initials(user?.name ?? "")}</div>
              <button className="btn ghost sm" onClick={logout}>Salir</button>
            </div>
          </div>
          {error ? (
            <div className="empty">
              <p>{error}</p>
              <button className="btn soft" style={{ marginTop: 12 }} onClick={reload}>Reintentar</button>
            </div>
          ) : !orgs || !plans ? (
            <Empty>Cargando…</Empty>
          ) : page === "planes" ? (
            <PlansView plans={plans} orgs={orgs} reload={reload} />
          ) : (
            <OrganizationsView orgs={orgs} plans={plans} reload={reload} />
          )}
        </main>
      </div>
    </ModalHost>
  )
}

// ── Empresas ──

function OrganizationsView({ orgs, plans, reload }: { orgs: Organization[]; plans: Plan[]; reload: () => Promise<void> }) {
  const { open } = useModal()
  const [q, setQ] = useState("")
  const list = orgs.filter((o) => !q || `${o.name} ${o.slug} ${o.users.map((u) => u.email).join(" ")}`.toLowerCase().includes(q.toLowerCase()))
  const count = (s: string) => orgs.filter((o) => o.subscription?.status === s).length

  return (
    <>
      <PageHead title="Empresas" sub="Las pastelerías, panaderías y cocinas que usan Destello.">
        <button className="btn primary" onClick={() => open(<OrganizationForm plans={plans} reload={reload} />)} disabled={!plans.length}>
          <Icon name="plus" />
          Nueva empresa
        </button>
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Kpi v={orgs.length} l="Empresas" c="c-accent" />
        <Kpi v={count("ACTIVE")} l="Activas pagando" c="c-mint" />
        <Kpi v={count("TRIALING")} l="En prueba" c="c-lilac" />
        <Kpi v={count("PAST_DUE") + orgs.filter((o) => !o.active).length} l="Con pago pendiente o bloqueadas" c="c-peach" />
      </div>
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
                          <div className="small muted">{o.slug}</div>
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
                    </td>
                    <td className="small num">{s ? dateFmt(s.currentPeriodEnd) : "—"}</td>
                    <td><span className="btn ghost sm">Ver</span></td>
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

function OrganizationForm({ plans, reload }: { plans: Plan[]; reload: () => Promise<void> }) {
  const { close } = useModal()
  const toast = useToast()
  const activePlans = plans.filter((p) => p.active)
  const [f, setF] = useState({ name: "", slug: "", planId: activePlans.find((p) => p.isTrial)?.id ?? activePlans[0]?.id ?? "", palette: "vainilla", ownerName: "", ownerEmail: "", ownerPassword: "" })
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

// Ficha de una empresa: suscripción, controles manuales, dueña y borrado.
function OrganizationPanel({ org, plans, reload }: { org: Organization; plans: Plan[]; reload: () => Promise<void> }) {
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

// ── Planes ──

function PlansView({ plans, orgs, reload }: { plans: Plan[]; orgs: Organization[]; reload: () => Promise<void> }) {
  const { open } = useModal()
  const using = (id: string) => orgs.filter((o) => o.subscription?.plan.id === id).length
  return (
    <>
      <PageHead title="Planes" sub="Lo que paga cada empresa. Al vencer la prueba gratuita se asigna el “Plan Mensual”.">
        <button className="btn primary" onClick={() => open(<PlanForm reload={reload} />)}>
          <Icon name="plus" />
          Nuevo plan
        </button>
      </PageHead>
      <div className="grid g3">
        {plans.map((p) => (
          <article className={`card ${p.isTrial ? "c-lilac" : "c-banana"}`} key={p.id}>
            <div className="row between">
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              <button className="iconbtn" aria-label={`Editar ${p.name}`} onClick={() => open(<PlanForm plan={p} reload={reload} />)}><Icon name="edit" /></button>
            </div>
            <div className="kpi" style={{ marginTop: 12 }}>
              <span className="v">{p.isTrial ? "Gratis" : money(p.price / 100)}</span>
              <span className="s">cada {p.durationDays} días</span>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 6 }}>
              <span className="chip white">{using(p.id)} empresas</span>
              {p.isTrial ? <span className="chip white">Prueba</span> : null}
              {!p.active ? <span className="chip bad">Inactivo</span> : null}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function PlanForm({ plan, reload }: { plan?: Plan; reload: () => Promise<void> }) {
  const { close } = useModal()
  const toast = useToast()
  const [f, setF] = useState({ name: plan?.name ?? "", price: plan ? String(plan.price / 100) : "", durationDays: String(plan?.durationDays ?? 30), isTrial: plan?.isTrial ?? false, active: plan?.active ?? true })
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }))
  return (
    <Modal
      title={plan ? "Editar plan" : "Nuevo plan"}
      onClose={close}
      onSubmit={async () => {
        const price = f.isTrial ? 0 : toNumber(f.price)
        if (!f.name.trim()) throw new FormError("Escribe el nombre.")
        if (!(price >= 0) || (!f.isTrial && !(price > 0))) throw new FormError("Escribe el precio en pesos.")
        if (!(toNumber(f.durationDays) >= 1)) throw new FormError("Escribe la duración en días.")
        const body = { name: f.name.trim(), price: Math.round(price * 100), durationDays: Math.round(toNumber(f.durationDays)), isTrial: f.isTrial, active: f.active }
        await api(plan ? `/plans/${plan.id}` : "/plans", { method: plan ? "PATCH" : "POST", body })
        await reload()
        toast(plan ? "Plan actualizado" : "Plan creado")
        close()
      }}
    >
      <Field label="Nombre"><input value={f.name} onChange={(e) => set({ name: e.target.value })} required /></Field>
      <div className="fields">
        <Field label="Precio ($)"><input type="number" min="0" step="1000" value={f.isTrial ? "0" : f.price} disabled={f.isTrial} onChange={(e) => set({ price: e.target.value })} /></Field>
        <Field label="Duración (días)"><input type="number" min="1" value={f.durationDays} onChange={(e) => set({ durationDays: e.target.value })} /></Field>
      </div>
      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={f.isTrial} onChange={(e) => set({ isTrial: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent-deep)" }} />
        Es una prueba gratuita
      </label>
      <label className="row small" style={{ gap: 8 }}>
        <input type="checkbox" checked={f.active} onChange={(e) => set({ active: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--accent-deep)" }} />
        Disponible para asignar
      </label>
    </Modal>
  )
}
