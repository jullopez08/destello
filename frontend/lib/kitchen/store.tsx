"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import type { KitchenSnapshot, Order, OrderLine } from "./types"
import { KitchenRuleData, productionPlan, TAX_RATE, usableLots } from "./rules"
import { usableStock } from "./batches"

interface KitchenValue {
  data: KitchenSnapshot
  /** Reglas de cálculo con los datos actuales */
  rules: KitchenRuleData
  /** Llama al backend con un cambio; devuelve el estado nuevo. Lanza si falla. */
  mutate: (path: string, method: string, body?: unknown, successMessage?: string) => Promise<KitchenSnapshot>
  /** Igual que mutate, pero muestra el error como aviso en vez de lanzarlo. */
  act: (path: string, method: string, body?: unknown, successMessage?: string) => Promise<void>
}

const KitchenContext = createContext<KitchenValue | null>(null)

export function KitchenProvider({ children, fallback }: { children: React.ReactNode; fallback: (error: string | null, retry: () => void) => React.ReactNode }) {
  const [data, setData] = useState<KitchenSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const toast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    api<KitchenSnapshot>("/kitchen", { signal: controller.signal })
      .then((snapshot) => {
        setData(snapshot)
        setError(null)
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setError(errorMessage(err))
      })
    return () => controller.abort()
  }, [attempt])

  const mutate = useCallback(
    async (path: string, method: string, body?: unknown, successMessage?: string) => {
      const snapshot = await api<KitchenSnapshot>(`/kitchen${path}`, { method, body })
      setData(snapshot)
      if (successMessage) toast(successMessage)
      return snapshot
    },
    [toast],
  )

  const act = useCallback(
    async (path: string, method: string, body?: unknown, successMessage?: string) => {
      try {
        await mutate(path, method, body, successMessage)
      } catch (err) {
        toast(errorMessage(err), true)
      }
    },
    [mutate, toast],
  )

  const rules = useMemo<KitchenRuleData | null>(
    () =>
      data && {
        // Lo vencido no cuenta como existencia (como en el backend).
        supplies: data.supplies.map((s) => ({ ...s, stock: usableStock(s.stock, data.supplyBatches.filter((b) => b.supplyId === s.id), data.today) })),
        recipes: data.recipes,
        // La masa vencida no se cuenta en el plan (como en el backend).
        lots: usableLots(data.lots, data.today),
        products: data.products,
        presentations: data.presentations,
        taxRate: TAX_RATE[data.settings.salesTax] ?? 0,
      },
    [data],
  )

  const value = useMemo(() => (data && rules ? { data, rules, mutate, act } : null), [data, rules, mutate, act])

  if (!value) return <>{fallback(error, () => setAttempt((n) => n + 1))}</>
  return <KitchenContext.Provider value={value}>{children}</KitchenContext.Provider>
}

export function useKitchen(): KitchenValue {
  const value = useContext(KitchenContext)
  if (!value) throw new Error("useKitchen debe usarse dentro de KitchenProvider")
  return value
}

// ── Ayudas de lectura ──

export const byId = <T extends { id: string }>(list: T[], id: string | null | undefined) => (id ? list.find((x) => x.id === id) : undefined)

// "3 × Galleta rellena · Macadamia", "1 × Cheesecake Mediano · Pistacho"
export function lineLabel(data: KitchenSnapshot, l: Pick<OrderLine, "presentationId" | "qty" | "productId" | "sizeId">) {
  const p = byId(data.presentations, l.presentationId)
  const size = byId(p?.sizes ?? [], l.sizeId)?.name
  const flavor = byId(data.products, l.productId)?.name
  return `${l.qty} × ${p?.name ?? ""}${size ? ` ${size}` : ""}${flavor ? ` · ${flavor}` : ""}`
}

export const orderSubtotal = (o: Order) => o.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
export const orderTotal = (o: Order) => orderSubtotal(o) + (o.fee || 0)

export function pendingFor(data: KitchenSnapshot, day: string) {
  return data.orders.filter((o) => o.productionDate === day && o.status === "PENDING" && !o.produced)
}

export function planFor(rules: KitchenRuleData, orders: Order[]) {
  return productionPlan(orders.flatMap((o) => o.lines), rules)
}

// Cajas de una edición vendidas mientras estuvo abierta.
export function editionSold(data: KitchenSnapshot, e: { startDate: string; endDate: string; presentationIds: string[] }) {
  return data.orders
    .filter((o) => o.status !== "CANCELLED" && o.orderedOn >= e.startDate && o.orderedOn <= e.endDate)
    .reduce((sum, o) => sum + o.lines.filter((l) => e.presentationIds.includes(l.presentationId)).reduce((s, l) => s + l.qty, 0), 0)
}
