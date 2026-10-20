"use client"

import { Icon } from "@/components/ui/icon"
import { HELP } from "@/lib/kitchen/help"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { recipeCostPerGram } from "@/lib/kitchen/rules"
import { lotState } from "@/lib/kitchen/lots"
import { dateLabel, grams, money, qty } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { LotForm, RecipeForm } from "../forms/recipe-forms"
import { DiscardLotForm } from "./lot-alerts"

// ── Recetas y masas ──

export function RecipesView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const lots = data.lots.filter((l) => l.left > 0)

  return (
    <>
      <PageHead title="Recetas y masas" sub="Tus masas y rellenos, y cuánto rinden." help={HELP.pageRecipes}>
        <button className="btn soft" onClick={() => open(<LotForm />)} disabled={!data.recipes.length}>Producir lote de masa</button>
        <button className="btn primary only-desktop" onClick={() => open(<RecipeForm />)}>
          <Icon name="plus" />
          Nueva receta
        </button>
      </PageHead>
      <button className="fab only-mobile" onClick={() => open(<RecipeForm />)}>
        <Icon name="plus" />
        Nueva receta
      </button>
      <h2 style={{ marginBottom: 12 }}>Masa guardada</h2>
      {lots.length ? (
        <div className="grid g3" style={{ marginBottom: 26 }}>
          {lots.map((l) => {
            const r = byId(data.recipes, l.recipeId)
            const st = lotState(l, data.today)
            return (
              <div className="card" key={l.id}>
                <div className="row between">
                  <b>{r?.name}</b>
                  <span className={`chip ${st.expired ? "bad" : st.warn ? "warn" : "good"}`}>{st.label}</span>
                </div>
                <div className="kpi" style={{ marginTop: 10 }}>
                  <span className="v">{grams(l.left)}</span>
                  <span className="s">
                    de {grams(l.grams)} · hecha {dateLabel(l.madeOn, data.today).toLowerCase()} · vence {dateLabel(l.expiresOn, data.today).toLowerCase()}
                  </span>
                </div>
                <div className="bar" style={{ marginTop: 10 }}>
                  <span style={{ width: `${(l.left / l.grams) * 100}%` }} />
                </div>
                {st.expired ? <p className="small" style={{ margin: "10px 0 0" }}>Ya no se cuenta en la producción. Bótala para sacarla de la masa guardada.</p> : null}
                <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
                  <button type="button" className={`btn ${st.expired ? "soft" : "ghost"} sm`} onClick={() => open(<DiscardLotForm lot={l} />)}>
                    <Icon name="trash" />
                    Botar masa
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty style={{ marginBottom: 26 }}>No hay masa guardada.</Empty>
      )}
      <h2 style={{ marginBottom: 12 }}>Recetas</h2>
      {data.recipes.length ? (
        <div className="grid g3">
          {data.recipes.map((r) => {
            const lot = data.products.some((p) => p.recipeId === r.id && p.mode === "LOT")
            const filling = !data.products.some((p) => p.recipeId === r.id) && data.products.some((p) => p.extras.some((e) => e.recipeId === r.id))
            return (
              <article className={`card c-${r.color}`} key={r.id}>
                <div className="row between">
                  <h3 style={{ margin: 0 }}>{r.name}</h3>
                  <button className="iconbtn" aria-label={`Editar ${r.name}`} onClick={() => open(<RecipeForm recipe={r} />)}>
                    <Icon name="edit" />
                  </button>
                </div>
                <div className="row" style={{ margin: "10px 0 12px", gap: 6 }}>
                  <span className="chip white">Rinde {grams(r.yieldGrams)}</span>
                  <span className="chip white">{money(recipeCostPerGram(r, data.supplies) * 1000)} / kg</span>
                  <span className="chip accent">{filling ? "Relleno" : lot ? "Por lote" : "Sobre pedido"}</span>
                </div>
                <div className="list small">
                  {r.items.map((i) => {
                    const s = byId(data.supplies, i.supplyId)
                    return (
                      <div className="it" style={{ padding: "6px 0", borderColor: "rgba(61,36,23,.15)" }} key={i.supplyId}>
                        <span>{s?.name}</span>
                        <span className="num">{qty(i.qty, s?.kind)}</span>
                      </div>
                    )
                  })}
                </div>
                {lot ? (
                  <button className="btn sm" style={{ marginTop: 12, background: "var(--surface)" }} onClick={() => open(<LotForm recipeId={r.id} />)}>
                    Producir lote
                  </button>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <Empty>Aún no tienes recetas. Empieza por la masa que más usas.</Empty>
      )}
    </>
  )
}
