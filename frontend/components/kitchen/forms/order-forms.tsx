"use client"

import { useEffect, useRef, useState } from "react"
import { Modal, FormError } from "@/components/ui/modal"
import { Icon } from "@/components/ui/icon"
import { byId, orderSubtotal, orderTotal, pendingFor, useKitchen } from "@/lib/kitchen/store"
import { productionPlan } from "@/lib/kitchen/rules"
import { addDays } from "@/lib/kitchen/rules"
import { dateLabel, longDate, money } from "@/lib/kitchen/format"
import type { CookieLook, Order } from "@/lib/kitchen/types"
import { answerQuestion, createRecognition, productionAnswer, speak, stopSpeaking } from "@/lib/kitchen/voice"
import { ColorSeg, Eyebrow, Field, LinesEditor, Seg, toNumber, useModal } from "../shared"

// ── Pedido a mano (los de WhatsApp los registra la dueña igual) ──

type Row = { presentationId: string; qty: string }

export function OrderForm() {
  const { data, rules, mutate } = useKitchen()
  const { close } = useModal()
  const pd = data.nextProductionDate
  const [customer, setCustomer] = useState("")
  const [phone, setPhone] = useState("")
  const [rows, setRows] = useState<Row[]>([{ presentationId: "", qty: "1" }])
  const [delivery, setDelivery] = useState<Order["delivery"]>("DELIVERY")
  const [payment, setPayment] = useState<Order["payment"]>("TRANSFER")
  const [address, setAddress] = useState("")
  const [fee, setFee] = useState("5000")

  const lines = rows.filter((r) => r.presentationId && toNumber(r.qty) > 0).map((r) => ({ presentationId: r.presentationId, qty: toNumber(r.qty) }))
  const committed = pendingFor(data, pd).flatMap((o) => o.lines)
  const plan = productionPlan([...committed, ...lines], rules)
  const dom = delivery === "DELIVERY"
  const sub = lines.reduce((sum, l) => sum + l.qty * (byId(data.presentations, l.presentationId)?.price ?? 0), 0)
  const feeN = dom ? toNumber(fee) || 0 : 0

  return (
    <Modal
      title="Nuevo pedido"
      sub={`Se produce ${dateLabel(pd, data.today).toLowerCase()} (${longDate(pd)}). El domicilio lo cotiza el repartidor.`}
      wide
      onClose={close}
      onSubmit={async () => {
        if (!customer.trim()) throw new FormError("Escribe el nombre del cliente.")
        const chosen = rows.filter((r) => r.presentationId)
        if (!chosen.length || chosen.some((r) => !(toNumber(r.qty) >= 1))) throw new FormError("Agrega al menos un producto con su cantidad.")
        if (dom && !address.trim()) throw new FormError("Escribe la dirección de entrega.")
        await mutate(
          "/orders",
          "POST",
          {
            customer: customer.trim(),
            phone: phone.trim() || undefined,
            delivery,
            address: dom ? address.trim() : undefined,
            payment,
            fee: Math.round(feeN),
            lines: chosen.map((r) => ({ presentationId: r.presentationId, qty: Math.round(toNumber(r.qty)) })),
          },
          "Pedido agregado",
        )
        close()
      }}
    >
      <div className="fields">
        <Field label="Cliente"><input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nombre" required /></Field>
        <Field label="WhatsApp"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="300 000 0000" /></Field>
      </div>
      <div className="eyebrow">Qué pidió</div>
      <LinesEditor
        rows={rows}
        setRows={setRows}
        blank={() => ({ presentationId: "", qty: "1" })}
        addLabel="Agregar producto"
        className="k-order"
        render={(r, update) => (
          <>
            <select aria-label="Presentación" value={r.presentationId} onChange={(e) => update({ presentationId: e.target.value })}>
              <option value="">Elige qué pidió</option>
              {data.presentations.filter((p) => p.active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {money(p.price)}
                </option>
              ))}
            </select>
            <input aria-label="Cantidad" type="number" min="1" step="1" value={r.qty} onChange={(e) => update({ qty: e.target.value })} />
          </>
        )}
      />
      <div className="fields">
        <div>
          <Eyebrow>Entrega</Eyebrow>
          <Seg name="delivery" value={delivery} onChange={setDelivery} options={[["DELIVERY", "Domicilio"], ["PICKUP", "Recoge en cocina"]]} />
        </div>
        <div>
          <Eyebrow>Pago</Eyebrow>
          <Seg name="payment" value={payment} onChange={setPayment} options={[["TRANSFER", "Transferencia"], ["CASH", "Efectivo"]]} />
        </div>
      </div>
      {dom ? (
        <div className="fields">
          <Field label="Dirección"><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, número, apto" /></Field>
          <Field label="Domicilio cotizado ($)"><input type="number" min="0" step="500" value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
        </div>
      ) : null}
      {lines.length ? (
        <>
          <div className={`callout ${plan.shortages.length ? "c-strawberry" : "c-sky"}`}>
            {plan.shortages.length ? (
              <>
                <b>Con los pedidos de ese día no alcanza:</b> {plan.shortages.map((x) => byId(data.supplies, x.supplyId)?.name).join(", ")}.
              </>
            ) : (
              <>
                <b>Se puede hacer.</b> Hay masa o insumos suficientes.
              </>
            )}
          </div>
          <div className="card c-banana" style={{ padding: "14px 16px" }}>
            <div className="row between"><span>Productos</span><span className="num">{money(sub)}</span></div>
            {dom ? <div className="row between"><span>Domicilio</span><span className="num">{money(feeN)}</span></div> : null}
            <div className="row between" style={{ marginTop: 6, fontSize: 18 }}>
              <b>Total para el cliente</b>
              <b className="num">{money(sub + feeN)}</b>
            </div>
            {payment === "CASH" && dom ? (
              <div className="small" style={{ marginTop: 6 }}>
                El repartidor paga {money(sub)} al recoger y cobra {money(sub + feeN)} al cliente.
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  )
}

// ── Enviar con un repartidor ──

export function SendForm({ order }: { order: Order }) {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [courierId, setCourierId] = useState(data.couriers[0]?.id ?? "")

  return (
    <Modal
      title={`Enviar pedido #${order.number}`}
      sub="Se le pregunta primero al repartidor principal. El cliente recibe solo el aviso de que va en camino."
      submit="Marcar en camino"
      onClose={close}
      onSubmit={async () => {
        if (!courierId) throw new FormError("Agrega un repartidor en Configuración.")
        await mutate(`/orders/${order.id}/send`, "POST", { courierId }, `Pedido #${order.number} va en camino`)
        close()
      }}
    >
      {data.couriers.length ? (
        <Seg
          name="courier"
          column
          value={courierId}
          onChange={setCourierId}
          options={data.couriers.map((c, i) => [c.id, `${i === 0 ? "Principal · " : ""}${c.name} · ${c.phone}`] as [string, string])}
        />
      ) : (
        <div className="empty">No hay repartidores. Agrégalos en Configuración.</div>
      )}
      <div className="callout c-banana small">
        {order.payment === "CASH" ? (
          <>
            Pago en efectivo: el repartidor paga {money(orderSubtotal(order))} al recoger y cobra <b>{money(orderTotal(order))}</b> al cliente.
          </>
        ) : (
          "Pagado por transferencia: el repartidor no cobra nada."
        )}
      </div>
    </Modal>
  )
}

// ── Edición especial ──

export function EditionForm() {
  const { data, mutate } = useKitchen()
  const { close } = useModal()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStart] = useState(data.today)
  const [endDate, setEnd] = useState(addDays(data.today, 14))
  const [cap, setCap] = useState("")
  const [color, setColor] = useState("strawberry")
  const [look, setLook] = useState<CookieLook>("star")
  const [pres, setPres] = useState<Set<string>>(new Set())

  return (
    <Modal
      title="Nueva edición especial"
      sub="Se vende hasta la fecha de cierre o hasta completar el cupo, lo que pase primero."
      onClose={close}
      onSubmit={async () => {
        if (!name.trim()) throw new FormError("Escribe el nombre.")
        if (endDate < startDate) throw new FormError("La fecha de cierre debe ser después del inicio.")
        if (!pres.size) throw new FormError("Elige al menos una presentación.")
        await mutate(
          "/editions",
          "POST",
          { name: name.trim(), description: description.trim() || undefined, startDate, endDate, cap: Math.max(0, Math.round(toNumber(cap) || 0)), color, look, presentationIds: [...pres] },
          "Edición creada",
        )
        close()
      }}
    >
      <Field label="Nombre"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Día de la madre" required /></Field>
      <Field label="Descripción"><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué trae y por qué es especial" /></Field>
      <div className="fields">
        <Field label="Desde"><input type="date" value={startDate} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="Hasta"><input type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} required /></Field>
        <Field label="Cupo (opcional)"><input type="number" min="1" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Sin límite" /></Field>
      </div>
      <div>
        <Eyebrow>Qué se vende</Eyebrow>
        <div className="seg">
          {data.presentations.map((p) => (
            <label key={p.id}>
              <input
                type="checkbox"
                checked={pres.has(p.id)}
                onChange={(e) => {
                  const next = new Set(pres)
                  if (e.target.checked) next.add(p.id)
                  else next.delete(p.id)
                  setPres(next)
                }}
              />
              <span>{p.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <Eyebrow>Figura</Eyebrow>
        <Seg name="look" value={look} onChange={setLook} options={[["star", "Dorada"], ["pump", "Calabaza"], ["", "Clásica"], ["choco", "Chocolate"]]} />
      </div>
      <div>
        <Eyebrow>Color</Eyebrow>
        <ColorSeg name="color" value={color} onChange={setColor} />
      </div>
    </Modal>
  )
}

// ── "¿Cuánto produzco hoy?" ──
// Escucha la pregunta con el micrófono (reconocimiento de voz del navegador),
// responde con el plan de producción y lo lee en voz alta. Sin IA ni servidor.
// Si el navegador no reconoce voz, igual muestra y lee la respuesta.

export function VoiceAnswer() {
  const { data, rules } = useKitchen()
  const { close } = useModal()
  const [question, setQuestion] = useState("¿Cuánto tengo que producir hoy?")
  const [answer, setAnswer] = useState(() => productionAnswer(data, rules))
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<ReturnType<typeof createRecognition>>(null)
  const supported = typeof window !== "undefined" && createRecognition() !== null

  useEffect(() => {
    // Al abrir, lee la respuesta de hoy (las voces cargan con un poco de retraso)
    const t = setTimeout(() => speak(answer), 300)
    return () => {
      clearTimeout(t)
      stopSpeaking()
      recognitionRef.current?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function listen() {
    const r = createRecognition()
    if (!r) return
    recognitionRef.current = r
    stopSpeaking()
    setError(null)
    setListening(true)
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? ""
      const reply = answerQuestion(text, data, rules)
      setQuestion(text ? `“${text}”` : "¿Cuánto tengo que producir hoy?")
      setAnswer(reply)
      speak(reply)
    }
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Permite el micrófono en el navegador para preguntarme en voz alta." : "No te escuché bien. Intenta de nuevo.")
    }
    r.onend = () => setListening(false)
    r.start()
  }

  return (
    <Modal title="¿Cuánto produzco hoy?" sub="Pregúntame como quieras: «¿cuántas galletas de chocolate hago?», «¿qué me falta?», «¿qué hay mañana?». Con la escucha activa basta decir «Oye Destello»." submit="Entendido" hideCancel onClose={close} onSubmit={close}>
      <div className="row nowrap" style={{ gap: 10 }}>
        <button
          type="button"
          className="avatar"
          style={{ background: listening ? "var(--strawberry, var(--accent))" : "var(--accent)", border: 0, cursor: supported ? "pointer" : "default" }}
          onClick={listen}
          disabled={!supported || listening}
          aria-label={listening ? "Escuchando" : "Preguntar en voz alta"}
        >
          <Icon name="mic" size={18} />
        </button>
        <div className="card c-banana" style={{ padding: "14px 16px" }}>
          <p><i>{listening ? "Te escucho…" : question}</i></p>
        </div>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <p>{answer}</p>
      </div>
      <div className="row" style={{ gap: 8 }}>
        {supported ? (
          <button type="button" className="btn soft sm" onClick={listen} disabled={listening}>
            <Icon name="mic" />
            {listening ? "Escuchando…" : "Preguntar en voz alta"}
          </button>
        ) : null}
        <button type="button" className="btn ghost sm" onClick={() => speak(answer)}>
          Escuchar de nuevo
        </button>
      </div>
      {!supported ? <p className="small muted">Tu navegador no reconoce voz; usa Chrome o Edge para preguntarme en voz alta.</p> : null}
      {error ? <p className="small" style={{ color: "var(--cherry, inherit)" }}>{error}</p> : null}
    </Modal>
  )
}
