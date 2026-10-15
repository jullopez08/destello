// Palabra clave "Oye Destello" y voz del navegador (reconocimiento y lectura en voz alta).

import { normalizeSpeech } from "./voice"

// ── Palabra clave "Oye Destello" ──
// El reconocimiento escribe "Destello" de muchas formas según el acento y el
// navegador: "destellos", "de stello", "des tello", "destelo", "testello" y,
// como en Colombia la "ll" suena "y", "desteyo" o "este yo" (así lo escribió
// Chrome en la prueba real: "Oye este yo"). Las variantes claras se aceptan
// solas; las que pueden ser palabras normales ("este yo", "estela") solo
// después de "oye/ey/hey/hola/ok".
// Lo que va después de la palabra clave es la pregunta (puede llegar en el
// siguiente resultado si la persona hace una pausa).
const WAKE_ALONE = /\b(?:oye |ey |hey |hola |ok |okey |o )?(?:de ?s ?tell?[oa]s?|de ?s ?te ?y[oa]s?|tes ?tell?os?)\b/
const WAKE_AFTER_CALL = /\b(?:oye|ey|hey|hola|ok|okey) (?:de )?(?:es ?tell?[oa]s?|es ?te ?y[oa]s?|tello|teyo)\b/

export function splitWakeWord(transcript: string): { heard: boolean; command: string } {
  const t = normalizeSpeech(transcript)
  const m = WAKE_ALONE.exec(t) ?? WAKE_AFTER_CALL.exec(t)
  if (!m) return { heard: false, command: "" }
  return { heard: true, command: t.slice(m.index + m[0].length).trim() }
}

// ── Voz del navegador (gratis, sin servidor) ──

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean; length: number }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

export function createRecognition(continuous = false): Recognition | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  if (!Ctor) return null
  const r = new Ctor()
  r.lang = "es-CO"
  r.continuous = continuous
  r.interimResults = false
  // En la escucha activa se revisan varias lecturas de la misma frase: la
  // primera a veces no trae "Destello" y la segunda sí
  r.maxAlternatives = continuous ? 3 : 1
  return r
}

// Chrome a veces suelta la frase de la memoria antes de terminarla y nunca
// avisa que acabó: se guarda aquí y, por si acaso, un temporizador da la
// lectura por terminada según lo largo del texto.
let currentUtterance: SpeechSynthesisUtterance | null = null

export function speak(text: string, onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.()
    return false
  }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === "es-CO") ?? voices.find((v) => v.lang.startsWith("es")) ?? null
  u.lang = u.voice?.lang ?? "es-CO"
  u.rate = 1
  currentUtterance = u
  if (onEnd) {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(watchdog)
      if (currentUtterance === u) currentUtterance = null
      onEnd()
    }
    const watchdog = setTimeout(finish, 3000 + text.length * 90)
    u.onend = finish
    u.onerror = finish
  }
  window.speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
}
