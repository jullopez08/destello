"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { createRecognition, stopSpeaking } from "@/lib/kitchen/speech"
import { answerQuestion } from "@/lib/kitchen/voice"
import type { Bubble, Controller } from "./voice-controller"
import { STORAGE_KEY, createController } from "./voice-controller"

// Escucha activa con palabra clave, como "Ok Google": con el interruptor
// encendido, el panel escucha y cuando oye "Oye Destello" responde la pregunta
// que sigue ("Oye Destello, ¿cuántas galletas de chocolate hago hoy?").
// Si la persona hace una pausa después de la palabra clave, la pregunta puede
// llegar en el siguiente resultado (hasta 8 segundos).
//
// VoiceProvider envuelve todo el panel (la escucha sigue al cambiar de sección
// y la respuesta sale en una burbuja); el botón para encenderla está en Hoy
// (VoiceToggle) y, mientras escucha, la barra superior lo indica (VoiceIndicator).
//
// Solo funciona con el panel abierto en Chrome o Edge. Mientras está encendido,
// el navegador envía el audio a su servicio de reconocimiento de voz (en Chrome,
// Google): por eso es un interruptor y se avisa en pantalla.


interface VoiceState {
  supported: boolean
  on: boolean
  heard: string
  error: string | null
  toggle(value: boolean): void
}

const VoiceContext = createContext<VoiceState>({ supported: false, on: false, heard: "", error: null, toggle: () => {} })

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const { data, rules } = useKitchen()
  const [supported] = useState(() => typeof window !== "undefined" && createRecognition() !== null)
  const [on, setOn] = useState(false)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [heard, setHeard] = useState("")
  const latest = useRef({ data, rules })
  const controller = useRef<Controller | null>(null)

  // Las respuestas usan siempre el estado más reciente de la cocina
  useEffect(() => {
    latest.current = { data, rules }
  }, [data, rules])

  useEffect(() => {
    if (!supported) return
    const c = createController((q) => answerQuestion(q, latest.current.data, latest.current.rules), { setOn, setBubble, setError, setHeard })
    controller.current = c
    let saved = false
    try {
      saved = localStorage.getItem(STORAGE_KEY) === "1"
    } catch {
      saved = false
    }
    // Si la dueña la dejó encendida, vuelve a escuchar al abrir el panel
    const resume = saved ? setTimeout(() => c.toggle(true), 0) : undefined
    return () => {
      clearTimeout(resume)
      c.dispose()
      controller.current = null
    }
  }, [supported])

  const state: VoiceState = { supported, on, heard, error, toggle: (v) => controller.current?.toggle(v) }

  return (
    <VoiceContext.Provider value={state}>
      {children}
      {bubble ? (
        <div
          role="status"
          className="card c-banana"
          style={{ position: "fixed", right: 20, bottom: 20, left: "auto", maxWidth: "min(380px, calc(100vw - 40px))", zIndex: 60, padding: "14px 16px", boxShadow: "0 10px 30px rgba(61,36,23,.18)" }}
        >
          <div className="row between" style={{ marginBottom: 6 }}>
            <b className="small">Destello</b>
            <button
              type="button"
              className="iconbtn"
              aria-label="Cerrar"
              onClick={() => {
                stopSpeaking()
                setBubble(null)
              }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
          {"waiting" in bubble ? (
            <p><i>Te escucho…</i></p>
          ) : (
            <>
              <p className="small muted"><i>“{bubble.question}”</i></p>
              <p style={{ marginTop: 6 }}>{bubble.answer}</p>
            </>
          )}
        </div>
      ) : null}
    </VoiceContext.Provider>
  )
}

/** Botón de Hoy: enciende o apaga "Oye Destello" y muestra lo último que oyó. */
export function VoiceToggle() {
  const { supported, on, heard, error, toggle } = useContext(VoiceContext)
  if (!supported) {
    return <span className="small muted">Para hablarle a Destello usa Chrome o Edge.</span>
  }
  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
      <button
        type="button"
        className={on ? "btn primary" : "btn soft"}
        onClick={() => toggle(!on)}
        aria-pressed={on}
        title={on ? "Escuchando. Di «Oye Destello» y tu pregunta. Pulsa para apagar." : "Enciende la escucha y pregunta en voz alta"}
      >
        <Icon name="mic" />
        {on ? "Escuchando: di «Oye Destello»" : "Activar «Oye Destello»"}
      </button>
      {error ? (
        <span className="small" style={{ color: "var(--cherry, inherit)" }}>{error}</span>
      ) : on ? (
        <span className="small muted">{heard ? `Oí: «${heard}»` : "Pregunta: «Oye Destello, ¿cuánto produzco hoy?»"}</span>
      ) : null}
    </div>
  )
}

/** Tarjeta grande de Hoy en el celular: enciende o apaga "Oye Destello". */
export function VoiceCard() {
  const { supported, on, heard, error, toggle } = useContext(VoiceContext)
  return (
    <button type="button" className={on ? "voice-card on" : "voice-card"} onClick={() => toggle(!on)} aria-pressed={on} disabled={!supported}>
      <span className="voice-card-mic"><Icon name="mic" size={24} /></span>
      <span className="voice-card-text">
        <b>{on ? "Escuchando: di «Oye Destello»" : "Di «Oye Destello»"}</b>
        <span>
          {!supported
            ? "Para hablarle a Destello usa Chrome o Edge."
            : error
              ? error
              : on
                ? heard
                  ? `Oí: «${heard}»`
                  : "Pregunta: «Oye Destello, ¿cuánto produzco hoy?» Toca para apagar."
                : "Toca para encenderlo y pregúntale qué hornear, quién reparte o qué se vende menos."}
        </span>
      </span>
    </button>
  )
}

/** Micrófono grande en el centro de la barra de abajo del celular. */
export function VoiceMicButton() {
  const { supported, on, toggle } = useContext(VoiceContext)
  return (
    <button
      type="button"
      className={on ? "tab-mic on" : "tab-mic"}
      onClick={() => toggle(!on)}
      aria-pressed={on}
      aria-label={on ? "Dejar de escuchar" : "Activar «Oye Destello»"}
      disabled={!supported}
      title={supported ? undefined : "Para hablarle a Destello usa Chrome o Edge."}
    >
      <Icon name="mic" size={26} />
    </button>
  )
}

/** En la barra superior, solo mientras escucha: así se sabe en cualquier sección. */
export function VoiceIndicator() {
  const { on, toggle } = useContext(VoiceContext)
  if (!on) return null
  return (
    <button type="button" className="pill" onClick={() => toggle(false)} title="Pulsa para dejar de escuchar" style={{ cursor: "pointer", border: "1px solid var(--ink)" }}>
      <Icon name="mic" size={14} />
      Escuchando
    </button>
  )
}
