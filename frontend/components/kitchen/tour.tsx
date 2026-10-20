"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { api } from "@/lib/api"
import { useSession } from "@/lib/session"
import { SECTION_TIPS, TOUR_START_EVENT, TOUR_STEPS } from "@/lib/kitchen/tour"
import { useModal } from "./shared"
import { OrderForm } from "./forms/order-forms"

type Box = { top: number; left: number; width: number; height: number }

const PAD = 8
const GAP = 12

/** La tarjeta va donde no tape lo resaltado: abajo si cabe, si no arriba; si no cabe en ninguno, donde haya más espacio. */
function cardSide(box: Box, cardHeight: number): "below" | "above" {
  const bottomBar = window.innerWidth <= 900 ? 100 : 24
  const below = window.innerHeight - bottomBar - (box.top + box.height)
  const above = box.top - 16
  if (below >= cardHeight + GAP) return "below"
  if (above >= cardHeight + GAP) return "above"
  return below >= above ? "below" : "above"
}

/** Lo primero de la lista que se vea en pantalla (en el celular hay botones que solo existen en el computador). */
function visibleTarget(targets?: string[]): HTMLElement | null {
  for (const sel of targets ?? []) {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el
    }
  }
  return null
}

// Guía del panel: sale sola la primera vez (sin `tourCompletedAt`) y otra vez con TOUR_START_EVENT.
export function Tour() {
  const { user, setUser } = useSession()
  const [step, setStep] = useState<number | null>(() => (user && !user.tourCompletedAt ? 0 : null))
  const [box, setBox] = useState<Box | null>(null)
  const [cardHeight, setCardHeight] = useState(240)
  const card = useRef<HTMLDivElement>(null)
  const current = step === null ? null : TOUR_STEPS[step]
  // Cambiar de paso borra el resaltado anterior hasta medir el nuevo.
  const go = useCallback((n: number | null) => {
    setBox(null)
    setStep(n)
  }, [])

  useEffect(() => {
    // Verla otra vez: también vuelven las tarjetas de cada sección.
    const start = () => {
      setUser((u) => ({ ...u, tourCompletedAt: null, seenTips: [] }))
      void api("/users/me/tour", { method: "PATCH", body: { done: false } }).catch(() => {})
      go(0)
    }
    window.addEventListener(TOUR_START_EVENT, start)
    return () => window.removeEventListener(TOUR_START_EVENT, start)
  }, [go, setUser])

  // Abre la sección del paso y espera a que aparezca lo que se resalta.
  useLayoutEffect(() => {
    if (!current) return
    if (window.location.hash !== `#${current.page}`) window.location.hash = current.page
    let tries = 0
    let frame = 0
    let target: HTMLElement | null = null
    const measure = () => {
      if (!target) return
      const r = target.getBoundingClientRect()
      const next = { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
      setBox((b) => (b && b.top === next.top && b.left === next.left && b.width === next.width && b.height === next.height ? b : next))
    }
    const find = window.setInterval(() => {
      target = visibleTarget(current.targets)
      if (target || ++tries > 20 || !current.targets) {
        window.clearInterval(find)
        if (!target) return
        target.scrollIntoView({ block: "center", behavior: "smooth" })
        const loop = () => {
          measure()
          if (card.current) setCardHeight(card.current.offsetHeight)
          frame = requestAnimationFrame(loop)
        }
        loop()
      }
    }, 100)
    return () => {
      window.clearInterval(find)
      cancelAnimationFrame(frame)
    }
  }, [current])

  const { open } = useModal()
  // Al final puede ir directo a registrar su primer pedido.
  const finish = useCallback((then?: "order") => {
    go(null)
    window.location.hash = then === "order" ? "pedidos" : "hoy"
    if (then === "order") open(<OrderForm />)
    if (user?.tourCompletedAt) return
    const now = new Date().toISOString()
    setUser((u) => ({ ...u, tourCompletedAt: now }))
    void api("/users/me/tour", { method: "PATCH", body: { done: true } }).catch(() => {})
  }, [user?.tourCompletedAt, setUser, go, open])

  useEffect(() => {
    if (step === null) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step, finish])

  if (!current || step === null) return null
  const last = step === TOUR_STEPS.length - 1
  const side = box ? cardSide(box, cardHeight) : "center"

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {box ? <div className="tour-spot" style={box} /> : <div className="tour-veil" />}
      <div ref={card} className={`tour-card card ${side}`}>
        <div className="small muted">Paso {step + 1} de {TOUR_STEPS.length}</div>
        <h2 id="tour-title">{current.title}</h2>
        <p>{current.text}</p>
        {last ? (
          <div className="tour-last">
            <button type="button" className="btn primary" autoFocus onClick={() => finish("order")}>Registrar mi primer pedido</button>
            <div className="row between nowrap">
              <button type="button" className="btn ghost sm" onClick={() => go(step - 1)}>Atrás</button>
              <button type="button" className="linkbtn" onClick={() => finish()}>Ahora no</button>
            </div>
          </div>
        ) : (
          <div className="row between nowrap">
            <button type="button" className="linkbtn" onClick={() => finish()}>Saltar guía</button>
            <div className="row nowrap">
              {step > 0 ? <button type="button" className="btn ghost sm" onClick={() => go(step - 1)}>Atrás</button> : null}
              <button type="button" className="btn primary sm" autoFocus onClick={() => go(step + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Primera vez en una sección (después de la guía): una tarjeta con qué hace, que se cierra con «Entendido».
export function SectionTip({ page }: { page: string }) {
  const { user, setUser } = useSession()
  const tip = SECTION_TIPS[page]
  if (!tip || !user?.tourCompletedAt || user.seenTips.includes(page)) return null
  const close = () => {
    setUser((u) => ({ ...u, seenTips: [...u.seenTips, page] }))
    void api("/users/me/tour", { method: "PATCH", body: { tip: page } }).catch(() => {})
  }
  return (
    <div className="section-tip card" role="note">
      <div>
        <b>{tip[0]}</b>
        <p>{tip[1]}</p>
      </div>
      <button type="button" className="btn soft sm" onClick={close}>Entendido</button>
    </div>
  )
}
