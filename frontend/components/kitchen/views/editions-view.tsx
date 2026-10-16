"use client"

import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { byId, editionSold, useKitchen } from "@/lib/kitchen/store"
import { dateLabel } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { EditionForm, EditionRemoveForm } from "../forms/edition-form"

// ── Ediciones especiales ──

export function EditionsView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const today = data.today

  return (
    <>
      <PageHead title="Ediciones especiales" sub="Productos de temporada que se venden entre dos fechas.">
        <button className="btn primary only-desktop" onClick={() => open(<EditionForm />)} disabled={!data.presentations.length}>
          <Icon name="plus" />
          Nueva edición
        </button>
      </PageHead>
      {data.presentations.length ? (
        <button className="fab only-mobile" onClick={() => open(<EditionForm />)}>
          <Icon name="plus" />
          Nueva edición
        </button>
      ) : null}
      {data.editions.length ? (
        <div className="grid g2">
          {data.editions.map((e) => {
            const sold = editionSold(data, e)
            const [tone, label] = e.endDate < today ? ["bad", "Cerrada"] : e.startDate > today ? ["lilac", "Próxima"] : ["good", "Activa"]
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
                      open(<EditionRemoveForm edition={e} />)
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
                {e.description ? <p style={{ margin: "12px 0" }}>{e.description}</p> : <div style={{ height: 12 }} />}
                <div className="row small" style={{ gap: 6 }}>
                  {e.presentationIds.map((id) => <span className="chip white" key={id}>{byId(data.presentations, id)?.name}</span>)}
                </div>
                <div className="edition-foot">
                  <span className="edition-dates">
                    <Icon name="calendar" />
                    {dateLabel(e.startDate, today)} – {dateLabel(e.endDate, today)}
                  </span>
                  <span><b className="num">{sold}</b> {sold === 1 ? "vendida" : "vendidas"}</span>
                </div>
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
