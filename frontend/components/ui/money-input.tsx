"use client"

import { useLayoutEffect, useRef } from "react"

// Campo de dinero (Julieth, 2026-10-19): puntos de miles y siempre dos centavos a la vista. Vacío muestra "0,00";
// al escribir 120000 se ve "120.000,00": los ",00" que faltan salen en gris pegados al número (no se escriben en
// el campo, así el cursor no se enreda) y se van llenando al escribir la coma y los centavos.
// Guarda el valor sin formato ("120000.86") para que `toNumber` lo lea igual que antes.

/** "120000.86" → "120.000,86"; "120000." → "120.000," (la coma recién escrita se respeta). */
export function formatMoneyInput(raw: string): string {
  if (!raw) return ""
  const [int, dec] = raw.split(".")
  const grouped = (int || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return dec === undefined ? grouped : `${grouped},${dec}`
}

/** Lo que escribe la persona ("120.000,8") → "120000.8": los puntos son de miles y la coma, de decimales. */
export function parseMoneyInput(text: string): string {
  const [int, ...rest] = text.replace(/[^\d,]/g, "").split(",")
  const digits = int.replace(/^0+(?=\d)/, "")
  if (!rest.length) return digits
  return `${digits || "0"}.${rest.join("").slice(0, 2)}`
}

/** Los centavos que faltan por escribir, en gris: ",00", "00", "0" o nada. */
export function missingCents(raw: string): string {
  if (!raw) return ""
  const dec = raw.split(".")[1]
  return dec === undefined ? ",00" : "0".repeat(2 - dec.length)
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string
  onChange: (raw: string) => void
}

export function MoneyInput({ value, onChange, className, placeholder = "0,00", ...rest }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const ghost = useRef<HTMLSpanElement>(null)
  const shown = formatMoneyInput(value)

  // Los centavos grises van con la misma letra y el mismo relleno del campo, justo después del número.
  useLayoutEffect(() => {
    if (!input.current || !ghost.current) return
    const cs = getComputedStyle(input.current)
    Object.assign(ghost.current.style, {
      font: cs.font,
      letterSpacing: cs.letterSpacing,
      paddingLeft: `${parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth)}px`,
    })
  })

  return (
    <span className={`money-field${className ? ` ${className}` : ""}`}>
      <input
        {...rest}
        ref={input}
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={shown}
        onChange={(e) => onChange(parseMoneyInput(e.target.value))}
      />
      <span ref={ghost} className="money-ghost" aria-hidden="true">
        <span className="money-typed">{shown}</span>
        {missingCents(value)}
      </span>
    </span>
  )
}
