"use client"

import { Icon } from "@/components/ui/icon"
import { MORE_COLORS, PAGES, TAB_PAGES } from "@/lib/kitchen/pages"
import { useSession } from "@/lib/session"
import { VoiceToggle } from "../voice-listener"

/** "Más" en el celular: las secciones que no caben en la barra de abajo. */
export function MoreView() {
  const pages = PAGES.filter(([k]) => !TAB_PAGES.includes(k))
  const { user, logout } = useSession()
  return (
    <div className="stack">
      <div className="head">
        <div>
          <h1>Más</h1>
          <p className="muted">Todo lo demás de tu cocina.</p>
        </div>
      </div>
      <div className="more-grid">
        {pages.map(([k, title, icon]) => (
          <a key={k} href={`#${k}`} className={`card more-tile ${MORE_COLORS[k] ?? ""}`}>
            <Icon name={icon} size={26} />
            <b>{title}</b>
          </a>
        ))}
      </div>
      <div className="card row between">
        <div>
          <b>«Oye Destello»</b>
          <p className="small muted">Pregúntale en voz alta mientras cocinas.</p>
        </div>
        <VoiceToggle />
      </div>
      <div className="card row between">
        <div style={{ minWidth: 0 }}>
          <b>{user?.name}</b>
          <p className="small muted" style={{ overflowWrap: "anywhere" }}>{user?.email}</p>
        </div>
        <button className="btn ghost" onClick={logout}>Salir</button>
      </div>
    </div>
  )
}
