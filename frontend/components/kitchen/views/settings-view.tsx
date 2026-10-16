"use client"

import { useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { PALETTES } from "@/lib/palettes"
import { useKitchen } from "@/lib/kitchen/store"
import { DAYS, initials, phoneInput } from "@/lib/kitchen/format"
import { Eyebrow, Field, PageHead } from "../shared"
import { AccountsCard, CouriersCard, MyAccountCard, WhatsappCard } from "./settings-lists"

// Lunes primero, como se lee la semana; DAYS empieza en domingo (getDay).
const WEEK = [1, 2, 3, 4, 5, 6, 0]

// ── Configuración ──

export function SettingsView() {
  const { data, mutate, act } = useKitchen()
  const { user, setUser } = useSession()
  const toast = useToast()
  const st = data.settings
  const [f, setF] = useState({ name: st.name, whatsapp: st.whatsapp ?? "", orderCutoff: st.orderCutoff, targetMargin: String(st.targetMargin), closedDays: st.closedDays })
  const [saving, setSaving] = useState(false)
  // "Guardar cambios" solo se habilita si algo cambió frente a lo guardado.
  const sameDays = f.closedDays.length === st.closedDays.length && f.closedDays.every((d) => st.closedDays.includes(d))
  const dirty = f.name.trim() !== st.name || f.whatsapp !== (st.whatsapp ?? "") || f.orderCutoff !== st.orderCutoff || Number(f.targetMargin) !== st.targetMargin || !sameDays
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
      <div className="grid g2 settings">
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
            <div className="days" role="group" aria-label="Días cerrados">
              {WEEK.map((i) => (
                <label key={i} title={DAYS[i]}>
                  <input
                    type="checkbox"
                    checked={f.closedDays.includes(i)}
                    onChange={(e) => setF({ ...f, closedDays: e.target.checked ? [...f.closedDays, i] : f.closedDays.filter((x) => x !== i) })}
                    aria-label={DAYS[i]}
                  />
                  <span>{DAYS[i].slice(0, 3)}</span>
                </label>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>Toca los días que no produces ni entregas.</p>
          </div>
          <div className="save-bar">
            <button className="btn primary" type="submit" disabled={saving || !dirty}>{saving ? "Guardando…" : dirty ? "Guardar cambios" : "Sin cambios por guardar"}</button>
          </div>
        </form>

        <AccountsCard />
        <CouriersCard />
        <WhatsappCard />
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Tu marca</h2>
          <div>
            <Eyebrow>Paleta del panel</Eyebrow>
            <div className="palettes">
              {PALETTES.map((p) => (
                <label key={p.id}>
                  <input type="radio" name="palette" checked={(user?.palette ?? "vainilla") === p.id} onChange={() => branding({ palette: p.id })} />
                  <span className="dot" style={{ background: `linear-gradient(135deg, ${p.swatch} 50%, ${p.soft} 50%)` }} />
                  <span className="small">{p.name}</span>
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
            <p className="small muted" style={{ marginTop: 8 }}>Imagen cuadrada de hasta 5 MB. Sale arriba en tu panel.</p>
          </div>
        </div>

        <MyAccountCard />
      </div>
    </>
  )
}
