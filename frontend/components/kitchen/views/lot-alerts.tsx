"use client"

import { Icon } from "@/components/ui/icon"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { recipeCostPerGram } from "@/lib/kitchen/rules"
import { doughName, lotState } from "@/lib/kitchen/lots"
import { grams, money } from "@/lib/kitchen/format"
import type { DoughLot } from "@/lib/kitchen/types"
import { useModal } from "../shared"
import { ConfirmForm } from "../forms/confirm-form"

// Botar masa vencida o dañada: sale de la masa guardada y queda como pérdida en Analítica.
export function DiscardLotForm({ lot }: { lot: DoughLot }) {
  const { data } = useKitchen()
  const recipe = byId(data.recipes, lot.recipeId)
  const cost = recipe ? recipeCostPerGram(recipe, data.supplies) * lot.left : 0
  return (
    <ConfirmForm
      title="Botar masa"
      text={
        <>
          Vas a botar <b>{grams(lot.left)}</b> de {doughName(recipe?.name)}{cost > 0 ? <> (te costaron unos <b>{money(cost)}</b>)</> : null}. Sale de la masa guardada y
          queda como pérdida en Analítica.
        </>
      }
      label="Botar masa"
      path={`/lots/${lot.id}/discard`}
      method="POST"
      done="Masa botada"
    />
  )
}

// Avisos de Hoy: masa vencida (con botón para botarla), último día y quedan 2 días.
export function LotAlerts() {
  const { data } = useKitchen()
  const { open } = useModal()
  const alerts = data.lots
    .filter((l) => l.left > 0)
    .map((l) => ({ l, st: lotState(l, data.today), name: doughName(byId(data.recipes, l.recipeId)?.name) }))
    .filter((x) => x.st.warn)
    .sort((a, b) => a.st.daysLeft - b.st.daysLeft)
  if (!alerts.length) return null

  return (
    <div className="lot-alerts" role="group" aria-label="Avisos de la masa guardada">
      {alerts.map(({ l, st, name }) => (
        <div key={l.id} className={`callout ${st.expired ? "c-strawberry" : "c-peach"} lot-alert`}>
          <span>
            {st.expired ? (
              <>
                La <b>{name}</b> está <b>vencida</b> ({grams(l.left)}). Ya no se cuenta en la producción.
              </>
            ) : st.daysLeft === 1 ? (
              <>
                <b>Último día</b> para usar la <b>{name}</b> ({grams(l.left)}): vence mañana.
              </>
            ) : (
              <>
                Quedan <b>2 días</b> para usar la <b>{name}</b> ({grams(l.left)}) antes de que venza.
              </>
            )}
          </span>
          {st.expired ? (
            <button type="button" className="btn soft sm" onClick={() => open(<DiscardLotForm lot={l} />)}>
              <Icon name="trash" />
              Botar
            </button>
          ) : (
            <a className="btn ghost sm" href="#recetas">Ver masa</a>
          )}
        </div>
      ))}
    </div>
  )
}
