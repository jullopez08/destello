"use client"

import { useEffect, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useToast } from "@/components/ui/toast"
import { api, errorMessage } from "@/lib/api"
import { HELP } from "@/lib/kitchen/help"
import { HelpTip, useModal } from "../shared"
import { InviteView, NewPinForm, ROLE_NAME, StaffConfirm, StaffForm, type Created, type StaffMember } from "../forms/team-forms"

const seen = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" })

// Tu equipo (solo restaurantes): meseros con PIN y pantallas de cocina. Cada uno entra con un enlace de un solo uso
// que amarra su aparato; desde aquí se desconecta un aparato o se quita a alguien (Julieth eligió esta forma, 2026-10-19).
export function TeamCard() {
  const { open, push } = useModal()
  const toast = useToast()
  const [list, setList] = useState<StaffMember[] | null>(null)

  useEffect(() => {
    api<StaffMember[]>("/kitchen/staff").then(setList).catch((err) => toast(errorMessage(err), true))
  }, [toast])

  async function invite(m: StaffMember, pin?: string | null) {
    try {
      const { token } = await api<{ token: string }>(`/kitchen/staff/${m.id}/invite`, { method: "POST" })
      // Con la dirección que ve la dueña (192.168… en pruebas, el dominio en producción).
      const url = `${window.location.origin}/equipo/${token}`
      setList(await api<StaffMember[]>("/kitchen/staff"))
      open(<InviteView member={m} url={url} pin={pin} />)
    } catch (err) {
      toast(errorMessage(err), true)
    }
  }

  // Recién creado: sale de una vez su enlace y su PIN (es lo siguiente que hay que hacer).
  const created = ({ list: next, id, pin }: Created) => {
    setList(next)
    const member = next.find((m) => m.id === id)
    if (member) void invite(member, pin)
  }

  const removeDevice = (m: StaffMember, d: StaffMember["devices"][number]) =>
    push(
      <StaffConfirm
        title="Desconectar aparato"
        text={`${d.label} de ${m.name} dejará de entrar. Para volver a usarlo necesita un enlace nuevo.`}
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
      <p className="small muted" style={{ margin: 0 }}>Meseros y pantallas de cocina.</p>
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
                  <div className="small muted">{m.inviteExpiresAt ? "Enlace enviado, sin abrir" : "Sin aparato conectado"}</div>
                )}
              </div>
              <div className="row">
                <button type="button" className="btn soft sm" onClick={() => invite(m)}>Enviar enlace</button>
                {m.role === "WAITER" ? <button type="button" className="btn ghost sm" onClick={() => open(<NewPinForm member={m} />)}>Nuevo PIN</button> : null}
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
        <button type="button" className="btn soft sm" onClick={() => open(<StaffForm role="WAITER" onDone={created} />)}>
          <Icon name="plus" />
          Mesero
        </button>
        <button type="button" className="btn soft sm" onClick={() => open(<StaffForm role="KITCHEN" onDone={created} />)}>
          <Icon name="plus" />
          Pantalla de cocina
        </button>
      </div>
    </div>
  )
}
