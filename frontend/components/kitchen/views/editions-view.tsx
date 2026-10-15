"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { byId, editionSold, useKitchen } from "@/lib/kitchen/store"
import { dateLabel } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { EditionForm } from "../forms/order-forms"
import { ConfirmForm } from "../forms/confirm-form"

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
