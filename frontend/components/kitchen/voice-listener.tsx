"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { useKitchen } from "@/lib/kitchen/store"
import { answerQuestion, createRecognition, speak, splitWakeWord, stopSpeaking } from "@/lib/kitchen/voice"

// Escucha activa con palabra clave, como "Ok Google": con el interruptor
// encendido, el panel escucha y cuando oye "Oye Destello" responde la pregunta
// que sigue ("Oye Destello, ¿cuántas galletas de chocolate hago hoy?").
// Si la persona hace una pausa después de la palabra clave, la pregunta puede
// llegar en el siguiente resultado (hasta 8 segundos).
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

function createController(
  ask: (question: string) => string,
  ui: { setOn(v: boolean): void; setBubble(b: Bubble | null): void; setError(e: string | null): void },
): Controller {
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

  function start() {
    if (!on || speaking) return
    const r = createRecognition(true)
    if (!r) return
    recognition = r
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (!result.isFinal) continue
        const text = result[0]?.transcript ?? ""
        const { heard, command } = splitWakeWord(text)
        if (heard && command) {
          awaitingUntil = 0
          reply(command)
        } else if (heard) {
          awaitingUntil = Date.now() + FOLLOW_UP_MS
          ui.setBubble({ waiting: true })
        } else if (Date.now() < awaitingUntil && text.trim()) {
          awaitingUntil = 0
          reply(text.trim())
        }
      }
    }
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toggle(false)
        ui.setError("Permite el micrófono en el navegador para usar la escucha activa.")
      }
    }
    // Chrome corta la escucha cada cierto tiempo: se vuelve a encender sola
    r.onend = () => {
      if (on && !speaking) setTimeout(start, 400)
    }
    try {
      r.start()
    } catch {
      // Ya estaba escuchando
    }
  }

  function toggle(value: boolean) {
    on = value
    ui.setOn(value)
    ui.setError(null)
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

export function VoiceListener() {
  const { data, rules } = useKitchen()
  const [supported] = useState(() => typeof window !== "undefined" && createRecognition() !== null)
  const [on, setOn] = useState(false)
  const [bubble, setBubble] = useState<Bubble | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef({ data, rules })
  const controller = useRef<Controller | null>(null)

  // Las respuestas usan siempre el estado más reciente de la cocina
  useEffect(() => {
    latest.current = { data, rules }
  }, [data, rules])

  useEffect(() => {
    if (!supported) return
    const c = createController((q) => answerQuestion(q, latest.current.data, latest.current.rules), { setOn, setBubble, setError })
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

  if (!supported) return null

  return (
    <>
      <button
        type="button"
        className="pill"
        onClick={() => controller.current?.toggle(!on)}
        aria-pressed={on}
        title={on ? "Escuchando. Di «Oye Destello» y tu pregunta." : "Activa la escucha para preguntar en voz alta"}
        style={{ cursor: "pointer", border: on ? "1px solid var(--ink)" : undefined }}
      >
        <Icon name="mic" size={14} />
        {on ? "Di «Oye Destello»" : "Escucha apagada"}
      </button>
      {error ? <span className="small" style={{ color: "var(--cherry, inherit)" }}>{error}</span> : null}
      {bubble ? (
        <div
          role="status"
          className="card c-banana"
          style={{ position: "fixed", right: 20, bottom: 20, maxWidth: 380, zIndex: 60, padding: "14px 16px", boxShadow: "0 10px 30px rgba(61,36,23,.18)" }}
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
    </>
  )
}
