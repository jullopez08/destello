"use client"

import { useEffect, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { useSession } from "@/lib/session"
import { HelpTip, useModal } from "../shared"
import { InviteView, NewPinForm, ROLE_NAME, StaffConfirm, StaffForm, type Created, type StaffMember } from "../forms/team-forms"

const seen = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" })

// Tu equipo: meseros y pantallas de cocina. Cada uno entra con su enlace fijo y su PIN (Julieth, 2026-10-20); cada
// aparato que entra queda en la lista (y a la dueña le llega un correo), y desde aquí se desconecta o se quita a alguien.
export function TeamCard() {
  const { open, push } = useModal()
  // La pantalla de cocina es para todos; los meseros, solo si atiende en mesas.
  const tables = !!useSession().user?.servesTables
  const toast = useToast()
  const [list, setList] = useState<StaffMember[] | null>(null)

  useEffect(() => {
    api<StaffMember[]>("/kitchen/staff").then(setList).catch((err) => toast(errorMessage(err), true))
  }, [toast])

  const linkUrl = (token: string) => `${window.location.origin}/equipo/${token}`

  // Enlace nuevo: el de antes deja de servir. Con la dirección que ve la dueña (192.168… en pruebas, el dominio después).
  async function newLink(m: StaffMember) {
    const { token } = await api<{ token: string }>(`/kitchen/staff/${m.id}/link`, { method: "POST" })
    setList(await api<StaffMember[]>("/kitchen/staff"))
    return <InviteView member={m} url={linkUrl(token)} />
  }

  const changeLink = (m: StaffMember) =>
    m.hasLink
      ? push(<StaffConfirm title="Cambiar enlace" text="El enlace de ahora deja de servir. Los aparatos conectados siguen." label="Cambiar" run={() => newLink(m)} />)
      : newLink(m).then(open).catch((err) => toast(errorMessage(err), true))

  // Recién creado: sale de una vez su enlace y su PIN (es lo siguiente que hay que hacer).
  const created = ({ list: next, id, pin, token }: Created) => {
    setList(next)
    const member = next.find((m) => m.id === id)
    if (member) open(<InviteView member={member} url={linkUrl(token)} pin={pin} />)
  }

  const removeDevice = (m: StaffMember, d: StaffMember["devices"][number]) =>
    push(
      <StaffConfirm
        title="Desconectar aparato"
        text={`${d.label} de ${m.name} dejará de entrar. Si no lo reconoces, cambia también el enlace.`}
        label="Desconectar"
        run={async () => setList(await api<StaffMember[]>(`/kitchen/staff/${m.id}/devices/${d.id}`, { method: "DELETE" }))}
      />,
    )

  const remove = (m: StaffMember) =>
    push(
      <StaffConfirm
        title={`Quitar a ${m.name}`}
        text="Sus aparatos dejan de entrar de inmediato."
        label="Quitar"
        run={async () => setList(await api<StaffMember[]>(`/kitchen/staff/${m.id}`, { method: "DELETE" }))}
      />,
    )

  return (
    <div className="card stack">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Tu equipo <HelpTip text={HELP.staffTeam} /></h2>
      </div>
      <p className="small muted" style={{ margin: 0 }}>{tables ? "Meseros y pantallas de cocina." : "Pantallas de cocina. Los meseros salen si atiendes en mesas."}</p>
      {list === null ? <p className="small muted">Cargando…</p> : null}
      {list?.length ? (
        <div className="list">
          {list.map((m) => (
            <div className="it team-it" key={m.id}>
              <div>
                <b>{m.name}</b> <span className="chip">{ROLE_NAME[m.role]}</span>
                {m.devices.length ? (
                  m.devices.map((d) => (
                    <div className="small muted row nowrap" key={d.id}>
                      <span>
                        {d.label} · {seen(d.lastSeenAt)}
                        {d.lockedUntil && new Date(d.lockedUntil) > new Date() ? " · bloqueado por PIN" : ""}
                      </span>
                      <button type="button" className="linkbtn" onClick={() => removeDevice(m, d)}>Desconectar</button>
                    </div>
                  ))
                ) : (
                  <div className="small muted">Sin aparato conectado</div>
                )}
                {m.linkLockedUntil && new Date(m.linkLockedUntil) > new Date() ? <div className="small muted">Enlace bloqueado 15 min por PIN equivocados</div> : null}
              </div>
              <div className="row">
                <button type="button" className="btn soft sm" onClick={() => changeLink(m)}>{m.hasLink ? "Cambiar enlace" : "Crear enlace"}</button>
                <button type="button" className="btn ghost sm" onClick={() => open(<NewPinForm member={m} />)}>Nuevo PIN</button>
                <button type="button" className="iconbtn" aria-label={`Quitar a ${m.name}`} onClick={() => remove(m)}>
                  <Icon name="trash" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : list ? (
        <p className="small muted" style={{ margin: 0 }}>Aún no tienes a nadie.</p>
      ) : null}
      <div className="row">
        {tables ? (
          <button type="button" className="btn soft sm" onClick={() => open(<StaffForm role="WAITER" onDone={created} />)}>
            <Icon name="plus" />
            Mesero
          </button>
        ) : null}
        <button type="button" className="btn soft sm" onClick={() => open(<StaffForm role="KITCHEN" onDone={created} />)}>
          <Icon name="plus" />
          Pantalla de cocina
        </button>
      </div>
    </div>
  )
}
