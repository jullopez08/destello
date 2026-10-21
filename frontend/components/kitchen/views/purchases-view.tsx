"use client"

import { ReportButton } from "../report-button"
import { Icon } from "@/components/ui/icon"
import { HELP } from "@/lib/kitchen/help"
import { byId, useKitchen } from "@/lib/kitchen/store"
import { dateLabel, initials, longDate, money, qty } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { PurchaseForm } from "../forms/purchase-form"

// ── Compras ──

export function PurchasesView() {
  const { data } = useKitchen()
  const { open } = useModal()
  const month = data.purchases.filter((c) => c.date.slice(0, 7) === data.today.slice(0, 7)).reduce((a, c) => a + c.lines.reduce((x, l) => x + l.total, 0), 0)

  return (
    <>
      <PageHead title="Compras" sub="Lo que les compras a tus proveedores." help={HELP.pagePurchases}>
        <ReportButton kind="compras" />
        <button className="btn primary only-desktop" onClick={() => open(<PurchaseForm />)}>
          <Icon name="plus" />
          Registrar compra
        </button>
      </PageHead>
      <button className="fab only-mobile" onClick={() => open(<PurchaseForm />)}>
        <Icon name="plus" />
        Registrar compra
      </button>
      <p className="summary-line">
        Este mes llevas <b className="num">{money(month)}</b> en compras.
      </p>
      {data.purchases.length ? (
        <div className="stack">
          {data.purchases.map((c) => {
            const p = byId(data.suppliers, c.supplierId)
            return (
              <div className="card" key={c.id}>
                <div className="row between">
                  <div className="row">
                    <div className="avatar" style={{ background: `var(--${p?.color ?? "banana"})` }}>{initials(p?.name ?? "?")}</div>
                    <div>
                      <b>{p?.name ?? "Proveedor eliminado"}</b>
                      <div className="small muted">{/^\d/.test(dateLabel(c.date, data.today)) ? longDate(c.date) : `${dateLabel(c.date, data.today)} · ${longDate(c.date)}`}</div>
                    </div>
                  </div>
                  <b className="num">{money(c.lines.reduce((a, l) => a + l.total, 0))}</b>
                </div>
                <div className="row" style={{ marginTop: 12, gap: 6 }}>
                  {c.lines.map((l, i) => {
                    const s = byId(data.supplies, l.supplyId)
                    return (
                      <span className="chip banana" key={i}>
                        {s?.name} · {qty(l.qty, s?.kind)} · {money(l.total)}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty>Aún no hay compras.</Empty>
      )}
    </>
  )
}
