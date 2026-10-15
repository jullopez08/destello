// Controlador de la escucha activa: micrófono, palabra clave y respuesta en voz alta (sin React).

import { createRecognition, speak, splitWakeWord, stopSpeaking } from "@/lib/kitchen/speech"

export const STORAGE_KEY = "destello:escucha-activa"
export const FOLLOW_UP_MS = 8000

export type Bubble = { question: string; answer: string } | { waiting: true }

export interface Controller {
  toggle(value: boolean): void
  dispose(): void
}

export interface Ui {
  setOn(v: boolean): void
  setBubble(b: Bubble | null): void
  setError(e: string | null): void
  setHeard(t: string): void
}

export const ERRORS: Record<string, string> = {
  "not-allowed": "Permite el micrófono en el navegador para usar la escucha activa.",
  "service-not-allowed": "Este navegador no deja usar el reconocimiento de voz. Usa Chrome o Edge.",
  "audio-capture": "No encuentro el micrófono. Revisa que esté conectado y elegido en el navegador.",
  network: "El reconocimiento de voz necesita internet. Revisa la conexión.",
}

export function createController(ask: (question: string) => string, ui: Ui): Controller {
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
