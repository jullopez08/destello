"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, errorMessage } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import type { KitchenSnapshot, Order } from "./types"
import { KitchenRuleData, productionPlan } from "./rules"

interface KitchenValue {
  data: KitchenSnapshot
  /** Reglas de cálculo con los datos actuales */
  rules: KitchenRuleData
  /** Llama al backend con un cambio; la respuesta es el estado nuevo. Lanza si falla. */
  mutate: (path: string, method: string, body?: unknown, successMessage?: string) => Promise<void>
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
        supplies: data.supplies,
        recipes: data.recipes,
        lots: data.lots,
        products: data.products,
        presentations: data.presentations,
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
