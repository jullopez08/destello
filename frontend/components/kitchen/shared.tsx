"use client"

import { createContext, Fragment, useCallback, useContext, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { COLOR_NAMES } from "@/lib/kitchen/format"

// ── Ventanas abiertas desde cualquier vista ──

// open reemplaza lo que esté abierto; push abre una encima (crear la masa
// desde el producto) y close cierra solo la de arriba, volviendo a la anterior
// con lo que ya se había escrito.
type ModalApi = { open: (node: React.ReactNode) => void; push: (node: React.ReactNode) => void; close: () => void }
const ModalContext = createContext<ModalApi>({ open: () => {}, push: () => {}, close: () => {} })

export function ModalHost({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<React.ReactNode[]>([])
  const open = useCallback((n: React.ReactNode) => setStack([n]), [])
  const push = useCallback((n: React.ReactNode) => setStack((s) => [...s, n]), [])
  const close = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  return (
    <ModalContext.Provider value={{ open, push, close }}>
      {children}
      {stack.map((node, i) => (
        <Fragment key={i}>{node}</Fragment>
      ))}
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)

// ── Tarjeta de cifra ──

/**
 * Una cifra solo va en tarjeta si sirve para actuar (decisión de Julieth, 2026-10-16). Con `href`
 * u `onClick` la tarjeta lleva a lo que cuenta (la flecha avisa que se puede tocar); `on` la marca
 * como el filtro activo.
 */
export function Kpi({ v, l, s, c, href, onClick, on }: { v: React.ReactNode; l: string; s?: string; c: string; href?: string; onClick?: () => void; on?: boolean }) {
  const body = (
    <>
      <span className="l">{l}</span>
      <span className="v">{v}</span>
      {s ? <span className="s">{s}</span> : null}
    </>
  )
  const cls = `card ${c} kpi${href || onClick ? " kpi-link" : ""}${on ? " on" : ""}`
  if (href) return <a className={cls} href={href}>{body}</a>
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-pressed={on}>{body}</button>
  return <div className={cls}>{body}</div>
}

export function Empty({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="empty" style={style}>
      {children}
    </div>
  )
}

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="head">
      <div>
        <h1>{title}</h1>
        {sub ? <p className="muted">{sub}</p> : null}
      </div>
      {children ? <div className="row">{children}</div> : null}
    </div>
  )
}

/** Pestañas; el tercer valor opcional resalta una (p. ej. "alert" para "Bajos · 3"). */
export function Tabs<T extends string>({ value, options, onChange, style }: { value: T; options: [T, string, string?][]; onChange: (v: T) => void; style?: React.CSSProperties }) {
  return (
    <div className="tabs" style={style}>
      {options.map(([k, t, tone]) => (
        <button key={k} type="button" className={[k === value ? "on" : "", tone ?? ""].join(" ").trim()} onClick={() => onChange(k)} aria-pressed={k === value}>
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Controles de formulario ──

export const CARD_COLORS = ["banana", "strawberry", "lilac", "peach", "sky", "mint"] as const

export function ColorSeg({ value, onChange, name }: { value: string; onChange: (v: string) => void; name: string }) {
  return (
    <div className="seg">
      {CARD_COLORS.map((c) => (
        <label key={c}>
          <input type="radio" name={name} value={c} checked={value === c} onChange={() => onChange(c)} />
          <span style={value === c ? undefined : { background: `var(--${c})`, borderColor: "transparent" }}>{COLOR_NAMES[c]}</span>
        </label>
      ))}
    </div>
  )
}

export function Seg<T extends string>({ value, options, onChange, name, column }: { value: T; options: [T, string][]; onChange: (v: T) => void; name: string; column?: boolean }) {
  return (
    <div className={`seg${column ? " col" : ""}`}>
      {options.map(([k, t]) => (
        <label key={k}>
          <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k)} />
          <span style={column ? { display: "block" } : undefined}>{t}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * "?" al lado del nombre de un campo: al tocarlo se abre debajo qué es y para qué sirve
 * (textos en lib/kitchen/help.ts). Va dentro del <label>, así que no enfoca el campo.
 */
export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className="help-btn"
        aria-label="¿Qué es esto?"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault()
          setOpen(!open)
        }}
      >
        ?
      </button>
      {open ? <span className="help-tip" role="note">{text}</span> : null}
    </>
  )
}

export function Field({ label, hint, help, children }: { label: React.ReactNode; hint?: string; help?: string; children: React.ReactNode }) {
  return (
    <label className="f">
      <span className="f-label">
        {label}
        {help ? <HelpTip text={help} /> : null}
      </span>
      {children}
      {hint ? <span className="h">{hint}</span> : null}
    </label>
  )
}

export function Eyebrow({ children, help }: { children: React.ReactNode; help?: string }) {
  return (
    <div className="eyebrow" style={{ marginBottom: 6 }}>
      {children}
      {help ? <HelpTip text={help} /> : null}
    </div>
  )
}

// Lista de líneas editables (ingredientes, empaques, productos de una caja…).
export function LinesEditor<T>({
  rows,
  setRows,
  blank,
  addLabel,
  className,
  render,
}: {
  rows: T[]
  setRows: (rows: T[]) => void
  blank: () => T
  addLabel: string
  className: string
  render: (row: T, update: (patch: Partial<T>) => void) => React.ReactNode
}) {
  return (
    <>
      <div className="lines">
        {rows.map((row, i) => (
          <div className={`line ${className}`} key={i}>
            {render(row, (patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))))}
            <button
              type="button"
              className="iconbtn"
              aria-label="Quitar"
              onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [blank()])}
            >
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
      <div>
        <button type="button" className="btn soft sm" onClick={() => setRows([...rows, blank()])}>
          <Icon name="plus" />
          {addLabel}
        </button>
      </div>
    </>
  )
}

export const toNumber = (v: string) => (v.trim() === "" ? NaN : Number(v))
