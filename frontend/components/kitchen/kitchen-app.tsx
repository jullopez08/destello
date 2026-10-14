"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { Icon, type IconName } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { api } from "@/lib/api"
import type { MySubscription } from "@/lib/billing"
import { useSession } from "@/lib/session"
import { KitchenProvider, useKitchen } from "@/lib/kitchen/store"
import { initials, longDate } from "@/lib/kitchen/format"
import { SubscriptionView } from "@/components/billing/subscription-view"
import { Empty, ModalHost } from "./shared"
import { VoiceIndicator, VoiceProvider } from "./voice-listener"
import { OrdersView, ProductionView, TodayView, type OrderTab } from "./views/operations-views"
import { ProductsView, PurchasesView, RecipesView, SuppliersView, SuppliesView, type SupplyTab } from "./views/inventory-views"
import { AnalyticsView, EditionsView, SettingsView } from "./views/business-views"

const PAGES: [string, string, IconName][] = [
  ["hoy", "Hoy", "hoy"],
  ["pedidos", "Pedidos", "pedidos"],
  ["produccion", "Producción", "produccion"],
  ["proveedores", "Proveedores", "proveedores"],
  ["insumos", "Insumos", "insumos"],
  ["compras", "Compras", "compras"],
  ["recetas", "Recetas y masas", "recetas"],
  ["productos", "Productos y cajas", "productos"],
  ["ediciones", "Ediciones especiales", "ediciones"],
  ["analitica", "Analítica", "analitica"],
  ["configuracion", "Configuración", "configuracion"],
  ["suscripcion", "Suscripción", "suscripcion"],
]

// Navegación por #hash, como el diseño: cada sección tiene su enlace.
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
export function useHashPage(valid: string[], fallback: string) {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.replace("#", ""), () => "")
  return valid.includes(hash) ? hash : fallback
}

export function KitchenApp() {
  const [subscription, setSubscription] = useState<MySubscription | null>(null)

  const loadSubscription = useCallback(() => {
    api<MySubscription>("/subscriptions/me").then(setSubscription).catch(() => setSubscription({ hasAccess: false, awaitingFirstPayment: false }))
  }, [])
  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // Bloqueada por falta de pago, o esperando el primer pago: solo Suscripción.
  const locked = !!subscription && subscription.hasAccess && (!subscription.organizationActive || subscription.awaitingFirstPayment)

  if (!subscription) return <Shell page="hoy" locked><Empty>Cargando…</Empty></Shell>
  if (locked) return <Shell page="suscripcion" locked><SubscriptionView subscription={subscription} /></Shell>

  return (
    <KitchenProvider
      fallback={(error, retry) => (
        <Shell page="hoy" locked>
          {error ? (
            <div className="empty">
              <p>{error}</p>
              <button className="btn soft" style={{ marginTop: 12 }} onClick={retry}>Reintentar</button>
            </div>
          ) : (
            <Empty>Cargando la cocina…</Empty>
          )}
        </Shell>
      )}
    >
      <ModalHost>
        <KitchenPages subscription={subscription} />
      </ModalHost>
    </KitchenProvider>
  )
}

function KitchenPages({ subscription }: { subscription: MySubscription }) {
  const { data } = useKitchen()
  const page = useHashPage(PAGES.map((p) => p[0]), "hoy")
  // Estado de pestañas y búsquedas por sección, como el diseño.
  const [orderTab, setOrderTab] = useState<OrderTab>("pendiente")
  const [prodDay, setProdDay] = useState<string | null>(null)
  const [supplyTab, setSupplyTab] = useState<SupplyTab>("todos")
  const [supplyQuery, setSupplyQuery] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  const view = {
    hoy: <TodayView />,
    pedidos: <OrdersView tab={orderTab} setTab={setOrderTab} />,
    produccion: <ProductionView day={prodDay} setDay={setProdDay} />,
    proveedores: <SuppliersView query={supplierQuery} setQuery={setSupplierQuery} />,
    insumos: <SuppliesView tab={supplyTab} setTab={setSupplyTab} query={supplyQuery} setQuery={setSupplyQuery} />,
    compras: <PurchasesView />,
    recetas: <RecipesView />,
    productos: <ProductsView />,
    ediciones: <EditionsView />,
    analitica: <AnalyticsView />,
    configuracion: <SettingsView />,
    suscripcion: <SubscriptionView subscription={subscription} />,
  }[page]

  return (
    <VoiceProvider>
      <Shell page={page} cutoff={data.settings.orderCutoff} today={data.today} voice={<VoiceIndicator />}>
        {view}
      </Shell>
    </VoiceProvider>
  )
}

function Shell({ page, locked, cutoff, today, voice, children }: { page: string; locked?: boolean; cutoff?: string; today?: string; voice?: React.ReactNode; children: React.ReactNode }) {
  const { user, logout } = useSession()

  useEffect(() => {
    const on = document.querySelector<HTMLElement>(".nav a.on")
    if (on && window.innerWidth < 900) on.scrollIntoView({ inline: "center", block: "nearest" })
  }, [page])

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {user?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.logoUrl} alt="" />
          ) : (
            <Cookie size={38} />
          )}
          <div style={{ minWidth: 0 }}>
            <b>{user?.organizationName ?? "Destello"}</b>
            <small>con Destello</small>
          </div>
        </div>
        <nav className="nav" aria-label="Secciones">
          {PAGES.map(([k, t, icon]) => (
            <a key={k} href={`#${k}`} className={k === page ? "on" : ""} aria-current={k === page ? "page" : undefined} aria-disabled={locked && k !== "suscripcion" ? true : undefined}>
              <Icon name={icon} />
              <span>{t}</span>
            </a>
          ))}
        </nav>
        <div className="foot">
          <b>¿Necesitas ayuda?</b> Escríbenos y te ayudamos a configurar tu cocina.
        </div>
      </aside>
      <main className="main">
        <div className="top">
          <div className="row">
            {cutoff ? (
              <span className="pill">
                <i />
                Pedidos para hoy hasta las {cutoff}
              </span>
            ) : null}
            {today ? <span className="pill num">{longDate(today)}</span> : null}
            {voice}
          </div>
          <div className="who">
            <div style={{ textAlign: "right" }}>
              <b>{user?.name}</b>
              <div className="small muted">{user?.organizationName}</div>
            </div>
            <div className="avatar">{initials(user?.name ?? "")}</div>
            <button className="btn ghost sm" onClick={logout}>Salir</button>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
