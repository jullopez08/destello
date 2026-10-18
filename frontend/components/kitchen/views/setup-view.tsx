"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { grams } from "@/lib/kitchen/format"
import { PageHead, useModal } from "../shared"
import { BusinessForm } from "../forms/business-form"
import { RecipeForm } from "../forms/recipe-forms"
import { AccountForm, BREB_TYPE, CourierForm } from "../forms/settings-forms"

// ── Primeros pasos (decisión de Julieth, 2026-10-17) ──
// Un negocio nuevo, ya con acceso (prueba o pago), no ve el panel hasta dejar
// listo: el negocio, una receta, una llave Bre-B y un repartidor. El backend
// revisa lo mismo (kitchen-setup.ts) antes de marcarlo como terminado.

export function SetupView() {
  const { data, act } = useKitchen()
  const { open } = useModal()
  const [editBusiness, setEditBusiness] = useState(false)
  const keys = data.accounts.filter((a) => a.type === BREB_TYPE)
  const done = [!!data.settings.whatsapp, data.recipes.length > 0, keys.length > 0, data.couriers.length > 0]
  const count = done.filter(Boolean).length
  const [busy, setBusy] = useState(false)

  async function finish() {
    setBusy(true)
    await act("/setup/complete", "POST", undefined, "¡Tu cocina está lista!")
    setBusy(false)
  }

  return (
    <>
      <PageHead title="Primeros pasos" sub="Antes de empezar, deja lista tu cocina. Son 4 pasos y puedes cambiar todo después en Configuración." />
      <div className="prod-progress setup-progress" role="group" aria-label="Avance de los primeros pasos">
        <div className="row between">
          <b>{count} de 4 listos</b>
          <span className="small muted">{count === 4 ? "¡Todo listo!" : "Toca cada paso para completarlo"}</span>
        </div>
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${(count / 4) * 100}%` }} />
        </div>
      </div>

      <div className="setup-steps">
        <Step n={1} done={done[0]} title="Tu negocio" text="El nombre, el WhatsApp donde te piden, la hora de corte y los días que cierras.">
          {done[0] && !editBusiness ? (
            <div className="row between">
              <span className="small">{data.settings.name} · WhatsApp {data.settings.whatsapp}</span>
              <button type="button" className="btn ghost sm" onClick={() => setEditBusiness(true)}>Cambiar</button>
            </div>
          ) : (
            <BusinessForm setup onSaved={() => setEditBusiness(false)} />
          )}
        </Step>

        <Step n={2} done={done[1]} title="Tu primera receta" text="Una masa con sus ingredientes y cuántos gramos rinde. Los ingredientes que no tengas se crean ahí mismo.">
          <List items={data.recipes.map((r) => `${r.name} · rinde ${grams(r.yieldGrams)}`)} />
          <button type="button" className={`btn ${done[1] ? "soft" : "primary"} sm`} onClick={() => open(<RecipeForm />)}>
            <Icon name="plus" />
            {done[1] ? "Otra receta" : "Crear receta"}
          </button>
        </Step>

        <Step n={3} done={done[2]} title="Tu llave Bre-B" text="Donde tus clientes te transfieren: tu celular, correo, cédula o el código que te dio el banco.">
          <List items={keys.map((k) => `${k.number}${k.bank ? ` · ${k.bank}` : ""}`)} />
          <button type="button" className={`btn ${done[2] ? "soft" : "primary"} sm`} onClick={() => open(<AccountForm initialKind="breb" />)}>
            <Icon name="plus" />
            {done[2] ? "Otra llave o cuenta" : "Agregar llave Bre-B"}
          </button>
        </Step>

        <Step n={4} done={done[3]} title="Tus repartidores" text="Escribe cada nombre igual a como lo tienes guardado en tu WhatsApp. El primero es al que se le pregunta primero.">
          <List items={data.couriers.map((c) => `${c.name} · ${c.phone}`)} />
          <button type="button" className={`btn ${done[3] ? "soft" : "primary"} sm`} onClick={() => open(<CourierForm />)}>
            <Icon name="plus" />
            {done[3] ? "Otro repartidor" : "Agregar repartidor"}
          </button>
        </Step>
      </div>

      <div className="save-bar setup-finish">
        <button type="button" className="btn primary" disabled={count < 4 || busy} onClick={() => void finish()}>
          {busy ? "Entrando…" : count < 4 ? `Te faltan ${4 - count} ${4 - count === 1 ? "paso" : "pasos"}` : "Entrar a mi cocina"}
        </button>
      </div>
    </>
  )
}

function Step({ n, done, title, text, children }: { n: number; done: boolean; title: string; text: string; children: React.ReactNode }) {
  return (
    <section className={`card stack setup-step${done ? " done" : ""}`} aria-label={`Paso ${n}: ${title}`}>
      <div className="row nowrap" style={{ alignItems: "flex-start" }}>
        <span className="setup-num" aria-hidden="true">{done ? <Icon name="check" size={16} /> : n}</span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0 }}>
            {title} {done ? <span className="chip good">Listo</span> : null}
          </h2>
          <p className="small muted" style={{ margin: "4px 0 0" }}>{text}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function List({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className="list small">
      {items.map((t) => (
        <div className="it" key={t}>
          <span>{t}</span>
        </div>
      ))}
    </div>
  )
}
