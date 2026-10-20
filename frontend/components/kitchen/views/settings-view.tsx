"use client"

import { useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { PALETTES } from "@/lib/palettes"
import { useKitchen } from "@/lib/kitchen/store"
import { TOUR_START_EVENT } from "@/lib/kitchen/tour"
import { initials } from "@/lib/kitchen/format"
import { Eyebrow, PageHead } from "../shared"
import { BusinessForm } from "../forms/business-form"
import { AccountsCard, CouriersCard, MyAccountCard, WhatsappCard } from "./settings-lists"
import { TeamCard } from "./team-card"

// ── Configuración ──

export function SettingsView() {
  const { data, act } = useKitchen()
  const { user, setUser } = useSession()
  const toast = useToast()
  const st = data.settings
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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
      <PageHead title="Configuración" sub="Tu negocio, tu panel y tu cuenta.">
        <button type="button" className="btn soft" onClick={() => window.dispatchEvent(new Event(TOUR_START_EVENT))}>
          <Icon name="hoy" />
          Ver la guía otra vez
        </button>
      </PageHead>
      <div className="grid g2 settings">
        <div className="card stack">
          <h2 style={{ margin: 0 }}>El negocio</h2>
          <BusinessForm />
        </div>

        <AccountsCard />
        <CouriersCard />
        {user?.businessType === "RESTAURANT" ? <TeamCard /> : null}
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
            <p className="small muted" style={{ marginTop: 8 }}>Cambia los colores de la barra, los botones y los fondos.</p>
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
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
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
