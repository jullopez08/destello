"use client"

import { useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { PALETTES } from "@/lib/palettes"
import { useKitchen } from "@/lib/kitchen/store"
import { DAYS, initials, phoneInput } from "@/lib/kitchen/format"
import { Empty, Eyebrow, Field, PageHead, useModal } from "../shared"
import { AccountForm, BREB_TYPE, CourierForm } from "../forms/settings-forms"
import { ChangePasswordForm } from "../forms/password-form"

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
            <Field label="WhatsApp del negocio"><input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: phoneInput(e.target.value) })} inputMode="tel" placeholder="300 000 0000" /></Field>
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
