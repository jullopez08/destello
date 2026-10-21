"use client"

import { useEffect, useRef } from "react"

// Captcha invisible de la inscripción (Cloudflare Turnstile). Solo existe si hay NEXT_PUBLIC_TURNSTILE_SITE_KEY;
// casi nadie lo ve (si Cloudflare duda, sale una casilla). Cada respuesta sirve una vez: `round` cambia después de
// cada intento para pedir otra.
export const CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type Turnstile = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}
declare global {
  interface Window { turnstile?: Turnstile }
}

let loading: Promise<Turnstile> | null = null
function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = SCRIPT
    s.async = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")))
    s.onerror = () => {
      loading = null
      reject(new Error("turnstile"))
    }
    document.head.appendChild(s)
  })
  return loading
}

export function Captcha({ round, onToken }: { round: number; onToken: (token: string) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const callback = useRef(onToken)
  useEffect(() => {
    callback.current = onToken
  })

  useEffect(() => {
    if (!CAPTCHA_SITE_KEY) return
    let alive = true
    loadTurnstile()
      .then((t) => {
        if (!alive || !box.current || widget.current) return
        widget.current = t.render(box.current, {
          sitekey: CAPTCHA_SITE_KEY,
          appearance: "interaction-only",
          language: "es",
          callback: (token: string) => callback.current(token),
          "expired-callback": () => callback.current(""),
          "error-callback": () => callback.current(""),
        })
      })
      .catch(() => callback.current(""))
    return () => {
      alive = false
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [])

  useEffect(() => {
    if (round && widget.current) {
      callback.current("")
      window.turnstile?.reset(widget.current)
    }
  }, [round])

  return CAPTCHA_SITE_KEY ? <div ref={box} className="captcha" /> : null
}
