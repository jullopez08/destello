"use client"

import { useCallback, useEffect, useState } from "react"
import { Icon, type IconName } from "@/components/ui/icon"
import { Cookie } from "@/components/ui/cookie"
import { api, errorMessage } from "@/lib/api"
import { useSession } from "@/lib/session"
import { initials } from "@/lib/kitchen/format"
import { useHashPage } from "@/components/kitchen/kitchen-app"
import { Empty, ModalHost } from "@/components/kitchen/shared"
import type { Plan, Organization } from "./common"
import { OrganizationsView } from "./organizations-view"
import { PlansView } from "./plans-view"

// Panel de la super admin: todas las pastelerías, sus planes y sus pagos.

const PAGES: [string, string, IconName][] = [
  ["empresas", "Empresas", "empresas"],
  ["planes", "Planes", "planes"],
]

const fetchAll = () => Promise.all([api<Organization[]>("/organizations"), api<Plan[]>("/plans")])

export function SuperAdminApp() {
  const { user, logout } = useSession()
  const page = useHashPage(PAGES.map((p) => p[0]), "empresas")
  const [orgs, setOrgs] = useState<Organization[] | null>(null)
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback(([o, p]: [Organization[], Plan[]]) => {
    setOrgs(o)
    setPlans(p)
    setError(null)
  }, [])
  const reload = useCallback(async () => {
    try {
      apply(await fetchAll())
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [apply])
  useEffect(() => {
    fetchAll()
      .then(apply)
      .catch((err) => setError(errorMessage(err)))
  }, [apply])

  return (
    <ModalHost>
      <div className="app">
        <aside className="side">
          <div className="brand">
            <Cookie size={38} />
            <div>
              <b>Destello</b>
              <small>Super admin</small>
            </div>
          </div>
          <nav className="nav" aria-label="Secciones">
            {PAGES.map(([k, t, icon]) => (
              <a key={k} href={`#${k}`} className={k === page ? "on" : ""} aria-current={k === page ? "page" : undefined}>
                <Icon name={icon} />
                <span>{t}</span>
              </a>
            ))}
          </nav>
        </aside>
        <main className="main">
          <div className="top">
            <span className="pill"><i />Plataforma</span>
            <div className="who">
              <div style={{ textAlign: "right" }}>
                <b>{user?.name}</b>
                <div className="small muted">{user?.email}</div>
              </div>
              <div className="avatar">{initials(user?.name ?? "")}</div>
              <button className="btn ghost sm" onClick={logout}>Salir</button>
            </div>
          </div>
          {error ? (
            <div className="empty">
              <p>{error}</p>
              <button className="btn soft" style={{ marginTop: 12 }} onClick={reload}>Reintentar</button>
            </div>
          ) : !orgs || !plans ? (
            <Empty>Cargando…</Empty>
          ) : page === "planes" ? (
            <PlansView plans={plans} orgs={orgs} reload={reload} />
          ) : (
            <OrganizationsView orgs={orgs} plans={plans} reload={reload} />
          )}
        </main>
      </div>
    </ModalHost>
  )
}
