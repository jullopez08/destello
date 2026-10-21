"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/toast"
import { errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { useKitchen } from "@/lib/kitchen/store"
import { HELP } from "@/lib/kitchen/help"
import { DAYS, phoneInput } from "@/lib/kitchen/format"
import type { SalesTax } from "@/lib/kitchen/rules"
import { Eyebrow, Field, Seg } from "../shared"

const TAX_OPTIONS: [SalesTax, string][] = [["NONE", "Ninguno"], ["INC", "Al consumo 8 %"], ["IVA", "IVA 19 %"]]
const TAX_HINT: Record<SalesTax, string> = {
  NONE: "Persona natural, un solo local y ventas del año pasado por debajo de 3.500 UVT.",
  INC: "El de casi todos los restaurantes, panaderías y pastelerías, también a domicilio.",
  IVA: "Solo si tu negocio es una franquicia.",
}

// Lunes primero, como se lee la semana; DAYS empieza en domingo (getDay).
const WEEK = [1, 2, 3, 4, 5, 6, 0]

// "El negocio": en Configuración y como primer paso. En los primeros pasos
// (setup) el WhatsApp es obligatorio y el botón guarda aunque no cambie nada.
export function BusinessForm({ setup, onSaved }: { setup?: boolean; onSaved?: () => void }) {
  const { data, mutate } = useKitchen()
  const { setUser } = useSession()
  const toast = useToast()
  const st = data.settings
  const [f, setF] = useState({ name: st.name, whatsapp: st.whatsapp ?? "", orderCutoff: st.orderCutoff, targetMargin: String(st.targetMargin), closedDays: st.closedDays, servesTables: st.servesTables, normalMin: String(st.kitchenNormalMin), maxMin: String(st.kitchenMaxMin), salesTax: st.salesTax })
  const [saving, setSaving] = useState(false)
  // "Guardar cambios" solo se habilita si algo cambió frente a lo guardado.
  const sameDays = f.closedDays.length === st.closedDays.length && f.closedDays.every((d) => st.closedDays.includes(d))
  const dirty = f.name.trim() !== st.name || f.whatsapp !== (st.whatsapp ?? "") || f.orderCutoff !== st.orderCutoff || Number(f.targetMargin) !== st.targetMargin || !sameDays || f.servesTables !== st.servesTables || Number(f.normalMin) !== st.kitchenNormalMin || Number(f.maxMin) !== st.kitchenMaxMin || f.salesTax !== st.salesTax

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (setup && !f.whatsapp.trim()) return toast("Escribe el WhatsApp del negocio.", true)
    const normalMin = Number(f.normalMin), maxMin = Number(f.maxMin)
    if (!(normalMin >= 1) || !(maxMin > normalMin)) return toast("El tiempo máximo debe ser mayor que el normal.", true)
    setSaving(true)
    try {
      await mutate(
        "/settings",
        "PATCH",
        { name: f.name.trim() || st.name, whatsapp: f.whatsapp, orderCutoff: f.orderCutoff, closedDays: f.closedDays, targetMargin: Math.min(90, Math.max(5, Number(f.targetMargin) || 50)), servesTables: f.servesTables, kitchenNormalMin: normalMin, kitchenMaxMin: maxMin, salesTax: f.salesTax },
        setup ? "Negocio listo" : "Configuración guardada",
      )
      setUser((u) => ({ ...u, organizationName: f.name.trim() || st.name, servesTables: f.servesTables }))
      onSaved?.()
    } catch (err) {
      toast(errorMessage(err), true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stack" onSubmit={save}>
      <div className="fields">
        <Field label="Nombre" help={HELP.businessName}><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
        <Field label="WhatsApp del negocio" help={HELP.businessWhatsapp}>
          <input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: phoneInput(e.target.value) })} inputMode="tel" placeholder="300 000 0000" required={setup} />
        </Field>
        <Field label="Hora de corte de pedidos" help={HELP.businessCutoff} hint="Después de esta hora, el pedido pasa al siguiente día.">
          <input type="time" value={f.orderCutoff} onChange={(e) => setF({ ...f, orderCutoff: e.target.value })} required />
        </Field>
        <Field label="Tiempo normal de un plato (min)" help={HELP.kitchenNormal}><input type="number" inputMode="numeric" min="1" max="180" value={f.normalMin} onChange={(e) => setF({ ...f, normalMin: e.target.value })} /></Field>
        <Field label="Tiempo máximo (min)" help={HELP.kitchenMax}><input type="number" inputMode="numeric" min="2" max="240" value={f.maxMin} onChange={(e) => setF({ ...f, maxMin: e.target.value })} /></Field>
        <Field label="Margen que buscas (%)" help={HELP.businessMargin}><input type="number" min="5" max="90" value={f.targetMargin} onChange={(e) => setF({ ...f, targetMargin: e.target.value })} required /></Field>
      </div>
      <div>
        <Eyebrow help={HELP.businessTax}>¿Qué impuesto cobras?</Eyebrow>
        <Seg name="sales-tax" value={f.salesTax} onChange={(v) => setF({ ...f, salesTax: v })} options={TAX_OPTIONS} />
        <p className="small muted" style={{ marginTop: 6 }}>{TAX_HINT[f.salesTax]}</p>
      </div>
      <div>
        <Eyebrow help={HELP.businessTables}>¿Atiendes clientes en mesas?</Eyebrow>
        <Seg name="serves-tables" value={f.servesTables ? "si" : "no"} onChange={(v) => setF({ ...f, servesTables: v === "si" })} options={[["no", "No"], ["si", "Sí"]]} />
      </div>
      <div>
        <Eyebrow help={HELP.businessClosed}>Días cerrados</Eyebrow>
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
        {setup ? (
          <button className="btn primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar el negocio"}</button>
        ) : (
          <button className="btn primary" type="submit" disabled={saving || !dirty}>{saving ? "Guardando…" : dirty ? "Guardar cambios" : "Sin cambios por guardar"}</button>
        )}
      </div>
    </form>
  )
}
