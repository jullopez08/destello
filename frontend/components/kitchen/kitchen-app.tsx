"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { Icon } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { api } from "@/lib/api"
import type { MySubscription } from "@/lib/billing"
import { useSession } from "@/lib/session"
import { KitchenProvider, useKitchen } from "@/lib/kitchen/store"
import { PAGES, pagesFor, TAB_PAGES } from "@/lib/kitchen/pages"
import { longDate } from "@/lib/kitchen/format"
import { SubscriptionView } from "@/components/billing/subscription-view"
import { PayBanner } from "@/components/billing/pay-banner"
import { Empty, ModalHost } from "./shared"
import { MoreView } from "./views/more-view"
import { TodayView } from "./views/today-view"
import { OrdersView, type OrderTab } from "./views/orders-view"
import { ProductionView } from "./views/production-view"
import { SuppliersView } from "./views/suppliers-view"
import { SuppliesView, type SupplyTab } from "./views/supplies-view"
import { PurchasesView } from "./views/purchases-view"
import { RecipesView } from "./views/recipes-view"
import { ProductsView } from "./views/products-view"
import { EditionsView } from "./views/editions-view"
import { AnalyticsView } from "./views/analytics-view"
import { CashierView } from "./views/cashier-view"
import { SettingsView } from "./views/settings-view"
import { SetupView } from "./views/setup-view"
import { SectionTip, Tour } from "./tour"
import { AccountMenu } from "./account-menu"

// Navegación por #hash, como el diseño: cada sección tiene su enlace.
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
export function useHashPage(valid: string[], fallback: string) {
  // "#insumos/bajos": la sección es lo de antes de "/"; lo de después lo lee la sección.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.replace("#", "").split("/")[0], () => "")
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
  const page = useHashPage([...PAGES.map((p) => p[0]), "mas"], "hoy")
  // Estado de pestañas y búsquedas por sección, como el diseño.
  const [orderTab, setOrderTab] = useState<OrderTab>("pendiente")
  const [prodDay, setProdDay] = useState<string | null>(null)
  const [supplyTab, setSupplyTab] = useState<SupplyTab>("todos")
  const [supplyQuery, setSupplyQuery] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [page])

  // Desde Hoy, "Insumos bajos" abre Insumos en "Bajos" y un aviso de vencimiento en "Por vencer".
  useEffect(() => {
    const onHash = () => {
      const tab = window.location.hash === "#insumos/bajos" ? "bajos" : window.location.hash === "#insumos/vencer" ? "vencer" : null
      if (!tab) return
      setSupplyTab(tab)
      history.replaceState(null, "", "#insumos")
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

  // Negocio nuevo: primero los primeros pasos, sin menú ni otras secciones.
  if (!data.settings.setupDone) {
    return (
      <Shell page="hoy" locked cutoff={data.settings.orderCutoff} today={data.today}>
        <SetupView />
      </Shell>
    )
  }

  const view = {
    hoy: <TodayView />,
    pedidos: <OrdersView tab={orderTab} setTab={setOrderTab} />,
    caja: data.settings.servesTables ? <CashierView /> : <TodayView />,
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
    mas: <MoreView />,
  }[page]

  return (
      <Shell page={page} cutoff={data.settings.orderCutoff} today={data.today}>
        <PayBanner subscription={subscription} page={page} />
        <SectionTip page={page} />
        {view}
        <Tour />
      </Shell>
  )
}

function Shell({ page, locked, cutoff, today, children }: { page: string; locked?: boolean; cutoff?: string; today?: string; children: React.ReactNode }) {
  const { user } = useSession()

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
            <Cookie look={user?.makesMeals ? "plate" : ""} size={38} />
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <b>{user?.organizationName ?? "Destello"}</b>
            <small className="only-desktop">con Destello</small>
            <small className="only-mobile">{cutoff ? `Pedidos para hoy hasta las ${cutoff}` : "con Destello"}</small>
          </div>
          <AccountMenu className="only-mobile" />
        </div>
        <nav className="nav" aria-label="Secciones">
          {pagesFor(!!user?.servesTables).map(([k, t, icon]) => (
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
          </div>
          <div className="who">
            <div style={{ textAlign: "right" }}>
              <b>{user?.name}</b>
              <div className="small muted">{user?.organizationName}</div>
            </div>
            <AccountMenu />
          </div>
        </div>
        {children}
      </main>
      {locked ? null : <TabBar page={page} />}
    </div>
  )
}

/** Barra fija de abajo en el celular (en el computador se oculta y queda el menú lateral). */
function TabBar({ page }: { page: string }) {
  const tab = (k: string, title: string) => (
    <a href={`#${k}`} className={k === page ? "on" : ""} aria-current={k === page ? "page" : undefined}>
      <span className="ico"><Icon name={k as "hoy"} /></span>
      {title}
    </a>
  )
  const moreOn = !TAB_PAGES.includes(page)
  return (
    <nav className="tabbar" aria-label="Secciones principales">
      {tab("hoy", "Hoy")}
      {tab("pedidos", "Pedidos")}
      {tab("produccion", "Producción")}
      <a href="#mas" className={moreOn ? "on" : ""} aria-current={page === "mas" ? "page" : undefined}>
        <span className="ico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
            <rect x="4" y="4" width="6" height="6" rx="1.5" />
            <rect x="14" y="4" width="6" height="6" rx="1.5" />
            <rect x="4" y="14" width="6" height="6" rx="1.5" />
            <rect x="14" y="14" width="6" height="6" rx="1.5" />
          </svg>
        </span>
        Más
      </a>
    </nav>
  )
}
