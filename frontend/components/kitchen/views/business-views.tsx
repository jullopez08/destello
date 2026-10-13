"use client"

import { useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { PALETTES } from "@/lib/palettes"
import { byId, editionSold, orderSubtotal, useKitchen } from "@/lib/kitchen/store"
import { addDays, presentationCost, presentationHealth } from "@/lib/kitchen/rules"
import { dateLabel, DAYS, fmtN, initials, money } from "@/lib/kitchen/format"
import { Empty, Eyebrow, Field, Kpi, PageHead, useModal } from "../shared"
import { EditionForm } from "../forms/order-forms"
import { AccountForm, BREB_TYPE, CourierForm } from "../forms/settings-forms"
import { ConfirmForm } from "../forms/confirm-form"
import { ChangePasswordForm } from "../forms/password-form"

// ── Ediciones especiales ──

export function EditionsView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const today = data.today

  return (
    <>
      <PageHead title="Ediciones especiales" sub="Productos de temporada que se venden hasta una fecha o hasta completar un cupo.">
        <button className="btn primary" onClick={() => open(<EditionForm />)} disabled={!data.presentations.length}>
          <Icon name="plus" />
          Nueva edición
        </button>
      </PageHead>
      {data.editions.length ? (
        <div className="grid g2">
          {data.editions.map((e) => {
            const sold = editionSold(data, e)
            const [tone, label] = e.endDate < today || (e.cap && sold >= e.cap) ? ["bad", "Cerrada"] : e.startDate > today ? ["lilac", "Próxima"] : ["good", "Activa"]
            return (
              <article className={`card c-${e.color}`} key={e.id}>
                <div className="row between nowrap">
                  <div className="row nowrap">
                    <Cookie look={e.look} size={64} />
                    <div>
                      <span className={`chip ${tone}`}>{label}</span>
                      <h2 style={{ margin: "6px 0 0" }}>{e.name}</h2>
                    </div>
                  </div>
                  <button
                    className="iconbtn"
                    aria-label={`Eliminar ${e.name}`}
                    onClick={() =>
                      open(
                        <ConfirmForm
                          title="Eliminar edición"
                          text={<>Se eliminará <b>{e.name}</b>. Las presentaciones siguen existiendo.</>}
                          label="Eliminar"
                          path={`/editions/${e.id}`}
                          method="DELETE"
                          done="Edición eliminada"
                        />,
                      )
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                {e.description ? <p style={{ margin: "12px 0" }}>{e.description}</p> : <div style={{ height: 12 }} />}
                <div className="row small" style={{ gap: 6 }}>
                  {e.presentationIds.map((id) => <span className="chip white" key={id}>{byId(data.presentations, id)?.name}</span>)}
                </div>
                <div className="grid g4" style={{ marginTop: 14, gap: 10 }}>
                  <div className="kpi"><span className="l">Vendidas</span><span className="v" style={{ fontSize: 24 }}>{sold}{e.cap ? " / " + e.cap : ""}</span></div>
                  <div className="kpi"><span className="l">Desde</span><span className="v" style={{ fontSize: 18 }}>{dateLabel(e.startDate, today)}</span></div>
                  <div className="kpi"><span className="l">Hasta</span><span className="v" style={{ fontSize: 18 }}>{dateLabel(e.endDate, today)}</span></div>
                </div>
                {e.cap ? (
                  <div className="bar" style={{ marginTop: 12, height: 10, background: "rgba(255,255,255,.6)" }}>
                    <span style={{ width: `${Math.min(100, (sold / e.cap) * 100)}%` }} />
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <Empty>Aún no hay ediciones especiales. Crea una para la próxima temporada.</Empty>
      )}
    </>
  )
}

// ── Analítica ──

function WeekChart({ weeks }: { weeks: number[] }) {
  const W = 560, H = 230, pl = 56, pb = 28, pt = 24
  const max = Math.max(250000, Math.ceil(Math.max(...weeks) / 250000) * 250000)
  const bw = (W - pl - 10) / weeks.length
  const y = (v: number) => H - pb - (v / max) * (H - pb - pt)
  const ticks = [0, max / 2, max]
  const label = (t: number) => (t >= 1e6 ? fmtN(t / 1e6, 1) + " M" : fmtN(t / 1000) + " mil")
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ventas por semana">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pl} x2={W - 6} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="3 4" />
            <text x={pl - 8} y={y(t) + 4} textAnchor="end">{label(t)}</text>
          </g>
        ))}
        {weeks.map((v, i) => {
          const x = pl + i * bw + bw * 0.18, w = bw * 0.64, last = i === weeks.length - 1
          return (
            <g key={i}>
              <rect x={x} y={y(v)} width={w} height={Math.max(0, H - pb - y(v))} rx={8} fill={last ? "var(--accent-deep)" : "var(--peach)"}>
                <title>{money(v)}</title>
              </rect>
              {last ? <text className="lbl" x={x + w / 2} y={y(v) - 7} textAnchor="middle">{fmtN(v / 1000)} mil</text> : null}
              <text x={x + w / 2} y={H - 8} textAnchor="middle">{last ? "Esta" : "S" + (i + 1)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function AnalyticsView() {
  const { data, rules } = useKitchen()
  const live = data.orders.filter((o) => o.status !== "CANCELLED")
  // 8 semanas que terminan hoy
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = addDays(data.today, -7 * (7 - i))
    const start = addDays(end, -6)
    return live.filter((o) => o.orderedOn >= start && o.orderedOn <= end).reduce((a, o) => a + orderSubtotal(o), 0)
  })
  const last4 = weeks.slice(-4).reduce((a, b) => a + b, 0)
  const prev4 = weeks.slice(0, 4).reduce((a, b) => a + b, 0)
  const change = prev4 ? Math.round(((last4 - prev4) / prev4) * 100) : null
  const nOrders = live.filter((o) => o.orderedOn > addDays(data.today, -28)).length
  const units: Record<string, number> = {}
  for (const o of live) if (o.orderedOn > addDays(data.today, -56)) for (const l of o.lines) units[l.presentationId] = (units[l.presentationId] ?? 0) + l.qty
  const ranked = data.presentations.map((p) => ({ p, n: units[p.id] ?? 0 })).sort((a, b) => b.n - a.n)
  const max = Math.max(1, ...ranked.map((r) => r.n))
  const flagged = data.presentations
    .map((p) => ({ p, h: presentationHealth(p, rules, data.settings.targetMargin), c: presentationCost(p, rules) }))
    .filter((x) => x.h.kind !== "ok")

  return (
    <>
      <PageHead title="Analítica" sub="Qué se vende más, qué se vende poco y qué productos no dejan ganancia.">
        <span className="pill">Últimas 8 semanas</span>
      </PageHead>
      <div className="grid g4">
        <Kpi v={money(last4)} l="Ventas de las últimas 4 semanas" s={change === null ? "Sin semanas anteriores para comparar" : `${change >= 0 ? "+" : ""}${change} % frente a las 4 anteriores`} c="c-accent" />
        <Kpi v={nOrders} l="Pedidos" s="en 4 semanas" c="c-lilac" />
        <Kpi v={money(nOrders ? last4 / nOrders : 0)} l="Ticket promedio" s="sin domicilio" c="c-strawberry" />
        <Kpi v={flagged.length} l="Con margen bajo o pérdida" s="revisa el precio" c="c-peach" />
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Ventas por semana</h2>
          <WeekChart weeks={weeks} />
        </div>
        <div className="card">
          <h2>Los más vendidos</h2>
          <div className="hbars">
            {ranked.slice(0, 5).map((r) => (
              <div className="hbar" key={r.p.id}>
                <span className="t">{r.p.name}</span>
                <span className="n">{r.n}</span>
                <div className="bar"><span style={{ width: `${(r.n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Productos que no dejan ganancia</h2>
          {flagged.length ? (
            <div className="list">
              {flagged.map((x) => (
                <div className="it" key={x.p.id}>
                  <div>
                    <b>{x.p.name}</b>
                    <div className="small muted">Precio {money(x.p.price)} · cuesta {money(x.c)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={`chip ${x.h.kind}`}>{x.h.label}</span>
                    <div className="small" style={{ marginTop: 4 }}>Sube a <b>{money(x.h.suggested ?? 0)}</b></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Todos los productos tienen buen margen.</Empty>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>El precio sugerido busca un margen del {data.settings.targetMargin} %, que puedes cambiar en Configuración.</p>
        </div>
        <div className="card">
          <h2>Los que menos se venden</h2>
          <div className="hbars">
            {ranked.slice(-4).reverse().map((r) => (
              <div className="hbar" key={r.p.id}>
                <span className="t">{r.p.name}</span>
                <span className="n">{r.n}</span>
                <div className="bar warn"><span style={{ width: `${(r.n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Configuración ──

export function SettingsView() {
  const { data, mutate, act } = useKitchen()
  const { user, setUser } = useSession()
  const { open } = useModal()
  const toast = useToast()
  const st = data.settings
  const [f, setF] = useState({ name: st.name, whatsapp: st.whatsapp ?? "", orderCutoff: st.orderCutoff, targetMargin: String(st.targetMargin), closedDays: st.closedDays })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await mutate(
        "/settings",
        "PATCH",
        { name: f.name.trim() || st.name, whatsapp: f.whatsapp, orderCutoff: f.orderCutoff, closedDays: f.closedDays, targetMargin: Math.min(90, Math.max(5, Number(f.targetMargin) || 50)) },
        "Configuración guardada",
      )
      setUser((u) => ({ ...u, organizationName: f.name.trim() || st.name }))
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setSaving(false)
    }
  }

  async function branding(patch: { palette?: string; logoUrl?: string | null }) {
    try {
      const b = await api<{ palette: string; logoUrl: string | null }>("/organizations/me/branding", { method: "PATCH", body: patch })
      setUser((u) => ({ ...u, palette: b.palette, logoUrl: b.logoUrl }))
      await act("", "GET")
      toast(patch.palette ? "Paleta actualizada" : patch.logoUrl ? "Logo actualizado" : "Logo quitado")
    } catch (err) {
      toast(errorMessage(err), true)
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const { url } = await api<{ url: string }>("/uploads/logo", { method: "POST", body: form })
      await branding({ logoUrl: url })
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <>
      <PageHead title="Configuración" sub="Los datos de tu negocio, cómo se ve tu panel y tu cuenta." />
      <div className="grid g2">
        <form className="card stack" onSubmit={saveBusiness}>
          <h2 style={{ margin: 0 }}>El negocio</h2>
          <div className="fields">
            <Field label="Nombre"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="WhatsApp del negocio"><input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} inputMode="tel" /></Field>
            <Field label="Hora de corte de pedidos" hint="Después de esta hora, el pedido pasa al siguiente día.">
              <input type="time" value={f.orderCutoff} onChange={(e) => setF({ ...f, orderCutoff: e.target.value })} required />
            </Field>
            <Field label="Margen que buscas (%)"><input type="number" min="5" max="90" value={f.targetMargin} onChange={(e) => setF({ ...f, targetMargin: e.target.value })} required /></Field>
          </div>
          <div>
            <Eyebrow>Días cerrados</Eyebrow>
            <div className="seg">
              {DAYS.map((d, i) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={f.closedDays.includes(i)}
                    onChange={(e) => setF({ ...f, closedDays: e.target.checked ? [...f.closedDays, i] : f.closedDays.filter((x) => x !== i) })}
                  />
                  <span>{d[0].toUpperCase() + d.slice(1)}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <button className="btn primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </form>

        <div className="card stack">
          <h2 style={{ margin: 0 }}>Tu marca</h2>
          <div>
            <Eyebrow>Paleta del panel</Eyebrow>
            <div className="seg">
              {PALETTES.map((p) => (
                <label key={p.id}>
                  <input type="radio" name="palette" checked={(user?.palette ?? "vainilla") === p.id} onChange={() => branding({ palette: p.id })} />
                  <span className="row" style={{ gap: 6, display: "inline-flex" }}>
                    <span className="swatch" style={{ background: `linear-gradient(135deg, ${p.swatch} 50%, ${p.soft} 50%)`, width: 18, height: 18 }} />
                    {p.name}
                  </span>
                </label>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Cambia la barra lateral, los botones y los fondos. Los textos siempre van en café.</p>
          </div>
          <div>
            <Eyebrow>Logo</Eyebrow>
            <div className="row">
              {user?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.logoUrl} alt="Logo del negocio" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }} />
              ) : (
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 20, background: "var(--accent-soft)" }}>{initials(st.name)}</div>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <button className="btn soft sm" type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Icon name="upload" />
                {uploading ? "Subiendo…" : user?.logoUrl ? "Cambiar logo" : "Subir logo"}
              </button>
              {user?.logoUrl ? <button className="btn ghost sm" type="button" onClick={() => branding({ logoUrl: null })}>Quitar</button> : null}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>Imagen cuadrada de hasta 5 MB. Sale en la barra lateral.</p>
          </div>
        </div>

        <div className="card">
          <div className="row between">
            <h2 style={{ margin: 0 }}>Cuentas y llaves Bre-B</h2>
            <button className="btn soft sm" onClick={() => open(<AccountForm />)}>
              <Icon name="plus" />
              Agregar
            </button>
          </div>
          <p className="small muted" style={{ margin: "6px 0 10px" }}>Las que les compartes a tus clientes cuando pagan por transferencia: cuentas bancarias o llaves Bre-B (celular, correo, cédula o la que te dio tu banco).</p>
          {data.accounts.length ? (
            <div className="list">
              {data.accounts.map((a) => (
                <div className="it" key={a.id}>
                  <div>
                    <b>{a.type === BREB_TYPE ? `Llave Bre-B${a.bank ? ` · ${a.bank}` : ""}` : `${a.bank} · ${a.type}`}</b>
                    <div className="small num">{a.number} · {a.owner}</div>
                  </div>
                  <button className="iconbtn" aria-label="Eliminar cuenta" onClick={() => act(`/accounts/${a.id}`, "DELETE", undefined, "Cuenta eliminada")}>
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin cuentas ni llaves.</Empty>
          )}
        </div>

        <div className="card">
          <div className="row between">
            <h2 style={{ margin: 0 }}>Repartidores</h2>
            <button className="btn soft sm" onClick={() => open(<CourierForm />)}>
              <Icon name="plus" />
              Agregar
            </button>
          </div>
          <p className="small muted" style={{ margin: "6px 0 10px" }}>Se le pregunta primero al de arriba. Si no puede, se pasa al siguiente.</p>
          {data.couriers.length ? (
            <div className="list">
              {data.couriers.map((c, i) => (
                <div className="it" key={c.id}>
                  <div className="row">
                    <span className={`chip ${i === 0 ? "accent" : ""}`}>{i === 0 ? "Principal" : `${i + 1}º`}</span>
                    <div>
                      <b>{c.name}</b>
                      <div className="small num">{c.phone}</div>
                    </div>
                  </div>
                  <div className="row nowrap" style={{ gap: 0 }}>
                    <button className="iconbtn" aria-label="Subir" disabled={i === 0} onClick={() => act(`/couriers/${c.id}/move`, "POST", { direction: "up" })}><Icon name="up" /></button>
                    <button className="iconbtn" aria-label="Bajar" disabled={i === data.couriers.length - 1} onClick={() => act(`/couriers/${c.id}/move`, "POST", { direction: "down" })}><Icon name="down" /></button>
                    <button className="iconbtn" aria-label="Eliminar" onClick={() => act(`/couriers/${c.id}`, "DELETE", undefined, "Repartidor eliminado")}><Icon name="trash" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Sin repartidores.</Empty>
          )}
        </div>

        <div className="card">
          <h2>Tu cuenta</h2>
          <div className="list">
            <div className="it">
              <div className="row">
                <div className="avatar">{initials(user?.name ?? "")}</div>
                <div>
                  <b>{user?.name}</b>
                  <div className="small muted">Dueña · {user?.email}</div>
                </div>
              </div>
              <button className="btn soft sm" onClick={() => open(<ChangePasswordForm />)}>Cambiar contraseña</button>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>Si alguien entra a tu cuenta desde un dispositivo nuevo, te llega un correo.</p>
        </div>

        <div className="card c-mint">
          <h2>WhatsApp</h2>
          <p>Tus clientes te siguen escribiendo al WhatsApp de siempre y respondes desde tu celular. Aquí registras los pedidos y la cocina calcula el resto.</p>
        </div>
      </div>
    </>
  )
}
