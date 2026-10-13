"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { Icon } from "@/components/ui/icon"
import { COLOR_NAMES } from "@/lib/kitchen/format"

// ── Ventanas abiertas desde cualquier vista ──

const ModalContext = createContext<{ open: (node: React.ReactNode) => void; close: () => void }>({ open: () => {}, close: () => {} })

export function ModalHost({ children }: { children: React.ReactNode }) {
  const [node, setNode] = useState<React.ReactNode>(null)
  const open = useCallback((n: React.ReactNode) => setNode(n), [])
  const close = useCallback(() => setNode(null), [])
  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {node}
    </ModalContext.Provider>
  )
}

export const useModal = () => useContext(ModalContext)

// ── Tarjeta de cifra ──

export function Kpi({ v, l, s, c }: { v: React.ReactNode; l: string; s?: string; c: string }) {
  return (
    <div className={`card ${c} kpi`}>
      <span className="l">{l}</span>
      <span className="v">{v}</span>
      {s ? <span className="s">{s}</span> : null}
    </div>
  )
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

export function Tabs<T extends string>({ value, options, onChange, style }: { value: T; options: [T, string][]; onChange: (v: T) => void; style?: React.CSSProperties }) {
  return (
    <div className="tabs" style={style}>
      {options.map(([k, t]) => (
        <button key={k} type="button" className={k === value ? "on" : ""} onClick={() => onChange(k)} aria-pressed={k === value}>
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

export function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <label className="f">
      {label}
      {children}
      {hint ? <span className="h">{hint}</span> : null}
    </label>
  )
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow" style={{ marginBottom: 6 }}>
      {children}
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
