"use client"

import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { useKitchen } from "@/lib/kitchen/store"
import { dateLabel, initials, money } from "@/lib/kitchen/format"
import { Empty, PageHead, useModal } from "../shared"
import { SupplierForm } from "../forms/inventory-forms"
import { ConfirmForm } from "../forms/confirm-form"

// ── Proveedores ──

// En el celular, el teléfono abre la llamada o el chat. Un número de 10
// dígitos se toma como de Colombia (57).
function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, "")
  return `https://wa.me/${digits.length === 10 ? "57" + digits : digits}`
}

export function SuppliersView({ query, setQuery }: { query: string; setQuery: (q: string) => void }) {
  const { data } = useKitchen()
  const { open } = useModal()
  const toast = useToast()
  const q = query.toLowerCase()
  const suppliesOf = (id: string) => data.supplies.filter((s) => s.supplierId === id)
  const list = data.suppliers.filter((p) => !q || `${p.name} ${p.contact ?? ""} ${suppliesOf(p.id).map((s) => s.name).join(" ")}`.toLowerCase().includes(q))

  return (
    <>
      <PageHead title="Proveedores" sub="A quién le compras cada insumo y cómo contactarlo.">
        <button className="btn primary only-desktop" onClick={() => open(<SupplierForm />)}>
          <Icon name="plus" />
          Nuevo proveedor
        </button>
      </PageHead>
      <button className="fab only-mobile" onClick={() => open(<SupplierForm />)}>
        <Icon name="plus" />
        Nuevo proveedor
      </button>
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="search" placeholder="Buscar por nombre, contacto o insumo" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar proveedor" />
      </div>
      {list.length ? (
        <div className="grid g3">
          {list.map((p) => {
            const items = suppliesOf(p.id)
            const buys = data.purchases.filter((c) => c.supplierId === p.id)
            const spent = buys.reduce((a, c) => a + c.lines.reduce((x, l) => x + l.total, 0), 0)
            const last = buys.map((c) => c.date).sort().pop()
            return (
              <article className={`card c-${p.color} stack`} style={{ gap: 12 }} key={p.id}>
                <div className="row between nowrap">
                  <div className="row nowrap" style={{ minWidth: 0 }}>
                    <div className="avatar" style={{ background: "var(--surface)" }}>{initials(p.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0 }}>{p.name}</h3>
                      <div className="small">{p.contact || "Sin contacto"}</div>
                    </div>
                  </div>
                  <div className="row nowrap" style={{ gap: 0 }}>
                    <button className="iconbtn" title="Editar" aria-label={`Editar ${p.name}`} onClick={() => open(<SupplierForm supplier={p} />)}>
                      <Icon name="edit" />
                    </button>
                    <button
                      className="iconbtn"
                      title="Eliminar"
                      aria-label={`Eliminar ${p.name}`}
                      onClick={() =>
                        open(
                          <ConfirmForm
                            title="Eliminar proveedor"
                            text={<>Se eliminará <b>{p.name}</b>. Sus insumos quedarán sin proveedor y las compras se conservan.</>}
                            label="Eliminar"
                            path={`/suppliers/${p.id}`}
                            method="DELETE"
                            done="Proveedor eliminado"
                          />,
                        )
                      }
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
                <div className="stack small" style={{ gap: 6 }}>
                  {p.phone ? (
                    <div className="row" style={{ gap: 6 }}>
                      <Icon name="phone" size={16} />
                      <span className="num" style={{ userSelect: "all" }}>{p.phone}</span>
                      <button
                        className="iconbtn"
                        aria-label="Copiar teléfono"
                        onClick={() =>
                          navigator.clipboard
                            ?.writeText(p.phone!)
                            .then(() => toast("Copiado: " + p.phone))
                            .catch(() => toast("Selecciona el número para copiarlo"))
                        }
                      >
                        <Icon name="copy" size={14} />
                      </button>
                    </div>
                  ) : null}
                  {p.phone ? (
                    <div className="row only-mobile" style={{ gap: 8 }}>
                      <a className="btn sm" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>Llamar</a>
                      <a className="btn sm" href={whatsappLink(p.phone)} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                    </div>
                  ) : null}
                  {p.email ? (
                    <div className="row nowrap" style={{ gap: 6 }}>
                      <Icon name="mail" size={16} />
                      <span style={{ userSelect: "all", overflowWrap: "anywhere" }}>{p.email}</span>
                    </div>
                  ) : null}
                  {p.address ? (
                    <div className="row nowrap" style={{ gap: 6 }}>
                      <Icon name="pin" size={16} />
                      <span>{p.address}</span>
                    </div>
                  ) : null}
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {items.length ? items.map((s) => <span className="chip white" key={s.id}>{s.name}</span>) : <span className="small muted">Aún no tiene insumos asociados</span>}
                </div>
                {p.notes ? <p className="small" style={{ opacity: 0.85 }}>{p.notes}</p> : null}
                <div className="row between small" style={{ borderTop: "1px dashed rgba(61,36,23,.2)", paddingTop: 10 }}>
                  <span>{last ? "Última compra: " + dateLabel(last, data.today) : "Sin compras"}</span>
                  <b className="num">{money(spent)}</b>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <Empty>{data.suppliers.length ? "No hay proveedores con esa búsqueda." : "Aún no tienes proveedores. Agrega el primero."}</Empty>
      )}
    </>
  )
}
