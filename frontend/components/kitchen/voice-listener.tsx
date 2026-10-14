"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { answerQuestion, createRecognition, speak, splitWakeWord, stopSpeaking } from "@/lib/kitchen/voice"

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

const STORAGE_KEY = "destello:escucha-activa"
const FOLLOW_UP_MS = 8000

type Bubble = { question: string; answer: string } | { waiting: true }

interface Controller {
  toggle(value: boolean): void
  dispose(): void
}

interface Ui {
  setOn(v: boolean): void
  setBubble(b: Bubble | null): void
  setError(e: string | null): void
  setHeard(t: string): void
}

const ERRORS: Record<string, string> = {
  "not-allowed": "Permite el micrófono en el navegador para usar la escucha activa.",
  "service-not-allowed": "Este navegador no deja usar el reconocimiento de voz. Usa Chrome o Edge.",
  "audio-capture": "No encuentro el micrófono. Revisa que esté conectado y elegido en el navegador.",
  network: "El reconocimiento de voz necesita internet. Revisa la conexión.",
}

function createController(ask: (question: string) => string, ui: Ui): Controller {
  let on = false
  let speaking = false
  let awaitingUntil = 0
  let recognition: ReturnType<typeof createRecognition> = null

  function reply(question: string) {
    const answer = ask(question)
    ui.setBubble({ question, answer })
    speaking = true
    // Mientras habla no se escucha, para que no se oiga a sí mismo
    recognition?.stop()
    speak(answer, () => {
      speaking = false
      if (on) start()
    })
  }

  function handle(alternatives: string[]) {
    const texts = alternatives.map((t) => t.trim()).filter(Boolean)
    if (!texts.length) return
    ui.setHeard(texts[0])
    for (const text of texts) {
      const { heard, command } = splitWakeWord(text)
      if (heard && command) {
        awaitingUntil = 0
        return reply(command)
      }
      if (heard) {
        awaitingUntil = Date.now() + FOLLOW_UP_MS
        return ui.setBubble({ waiting: true })
      }
    }
    if (Date.now() < awaitingUntil) {
      awaitingUntil = 0
      reply(texts[0])
    }
  }

  function start() {
    if (!on || speaking) return
    const r = createRecognition(true)
    if (!r) return
    recognition = r
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (!result.isFinal) continue
        const alternatives: string[] = []
        for (let j = 0; j < result.length; j++) alternatives.push(result[j]?.transcript ?? "")
        handle(alternatives)
      }
    }
    r.onerror = (e) => {
      // "no-speech" y "aborted" son normales: se vuelve a escuchar al terminar
      const message = ERRORS[e.error]
      if (!message) return
      if (e.error === "not-allowed" || e.error === "service-not-allowed") toggle(false)
      ui.setError(message)
    }
    // Chrome corta la escucha cada cierto tiempo: se vuelve a encender sola
    r.onend = () => {
      if (recognition === r) recognition = null
      if (on && !speaking) setTimeout(start, 400)
    }
    try {
      r.start()
      ui.setError(null)
    } catch {
      // Ya estaba escuchando
    }
  }

  function toggle(value: boolean) {
    on = value
    ui.setOn(value)
    ui.setError(null)
    ui.setHeard("")
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0")
    } catch {
      // Sin almacenamiento: solo dura esta visita
    }
    if (value) start()
    else {
      recognition?.stop()
      stopSpeaking()
      ui.setBubble(null)
    }
  }

  return {
    toggle,
    dispose() {
      on = false
      recognition?.stop()
      stopSpeaking()
    },
  }
}

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
