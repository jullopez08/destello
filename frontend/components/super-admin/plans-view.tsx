"use client"

import { useState } from "react"
import { Icon } from "@/components/ui/icon"
import { Modal, FormError } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { api } from "@/lib/api"
import { money } from "@/lib/kitchen/format"
import { Field, PageHead, toNumber, useModal } from "@/components/kitchen/shared"
import type { Plan, Organization } from "./common"

// ── Planes ──

export function PlansView({ plans, orgs, reload }: { plans: Plan[]; orgs: Organization[]; reload: () => Promise<void> }) {
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
