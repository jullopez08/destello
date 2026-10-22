"use client"

import { Icon } from "@/components/ui/icon"
import { HELP } from "@/lib/kitchen/help"
import { useKitchen } from "@/lib/kitchen/store"
import { Empty, HelpTip, useModal } from "../shared"
import { AccountForm, BREB_TYPE, CourierForm } from "../forms/settings-forms"
import { ConfirmForm } from "../forms/confirm-form"

// ── Configuración: cuentas, repartidores, y WhatsApp ──

export function AccountsCard() {
  const { data } = useKitchen()
  const { open } = useModal()
  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Cuentas y llaves Bre-B</h2>
        <button className="btn soft sm" onClick={() => open(<AccountForm />)}>
          <Icon name="plus" />
          Agregar
        </button>
      </div>
      <p className="small muted" style={{ margin: "6px 0 10px" }}>Donde te pagan por transferencia. <HelpTip text={HELP.pageAccounts} /></p>
      {data.accounts.length ? (
        <div className="list">
          {data.accounts.map((a) => {
            const name = a.type === BREB_TYPE ? `Llave Bre-B${a.bank ? ` · ${a.bank}` : ""}` : `${a.bank} · ${a.type}`
            return (
              <div className="it" key={a.id}>
                <div style={{ minWidth: 0 }}>
                  <b>{name}</b>
                  <div className="small num" style={{ overflowWrap: "anywhere" }}>{a.number} · {a.owner}</div>
                </div>
                <button
                  className="iconbtn touch"
                  aria-label="Eliminar cuenta"
                  onClick={() => open(<ConfirmForm title="¿Eliminar esta cuenta?" text={<>Ya no aparecerá <b>{name}</b> ({a.number}) entre tus cuentas.</>} label="Eliminar" path={`/accounts/${a.id}`} method="DELETE" done="Cuenta eliminada" />)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <Empty>Sin cuentas ni llaves.</Empty>
      )}
    </div>
  )
}

export function CouriersCard() {
  const { data, act } = useKitchen()
  const { open } = useModal()
  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Repartidores</h2>
        <button className="btn soft sm" onClick={() => open(<CourierForm />)}>
          <Icon name="plus" />
          Agregar
        </button>
      </div>
      <p className="small muted" style={{ margin: "6px 0 10px" }}>Primero se le pregunta al de arriba.</p>
      {data.couriers.length ? (
        <div className="list">
          {data.couriers.map((c, i) => (
            <div className="it courier" key={c.id}>
              <div className="row" style={{ minWidth: 0 }}>
                <span className={`chip ${i === 0 ? "accent" : ""}`}>{i === 0 ? "Principal" : `${i + 1}º`}</span>
                <div style={{ minWidth: 0 }}>
                  <b>{c.name}</b>
                  <div className="small num">{c.phone}</div>
                </div>
              </div>
              <div className="row nowrap" style={{ gap: 0 }}>
                <button className="iconbtn touch" aria-label="Subir" disabled={i === 0} onClick={() => act(`/couriers/${c.id}/move`, "POST", { direction: "up" })}><Icon name="up" /></button>
                <button className="iconbtn touch" aria-label="Bajar" disabled={i === data.couriers.length - 1} onClick={() => act(`/couriers/${c.id}/move`, "POST", { direction: "down" })}><Icon name="down" /></button>
                <button
                  className="iconbtn touch"
                  aria-label="Eliminar"
                  onClick={() => open(<ConfirmForm title="¿Eliminar este repartidor?" text={<>Ya no se le ofrecerán envíos a <b>{c.name}</b>.</>} label="Eliminar" path={`/couriers/${c.id}`} method="DELETE" done="Repartidor eliminado" />)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Sin repartidores.</Empty>
      )}
    </div>
  )
}

/**
 * Lugar de la conexión con WhatsApp (Fase 7). Hoy no hay conexión: la dueña responde
 * desde su celular y registra los pedidos a mano. Cuando llegue el bot, aquí se conecta el número.
 */
export function WhatsappCard() {
  const { data } = useKitchen()
  const phone = data.settings.whatsapp
  return (
    <div className="card c-mint stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>WhatsApp</h2>
        <span className="chip">Aún no conectado</span>
      </div>
      <p style={{ margin: 0 }}>Por ahora respondes desde tu celular y anotas los pedidos aquí.</p>
      <p className="small" style={{ margin: 0 }}>
        Muy pronto podrás conectar {phone ? <b className="num">{phone}</b> : "tu número"} para que los pedidos lleguen solos a Destello.
      </p>
      <div>
        <button className="btn soft" type="button" disabled>Conectar WhatsApp · pronto</button>
      </div>
    </div>
  )
}
