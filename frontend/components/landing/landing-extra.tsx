import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { Icon } from "@/components/ui/icon"
import { ANDROID_APK_URL, contactHref, RESTAURANT_MESSAGE, TRIAL_MESSAGE } from "@/lib/contact"

// ── Página de presentación: restaurantes (pronto), instalar, preguntas, contacto y pie ──

/** Interés de restaurantes con mesas: mide la demanda antes de construir el modo restaurante (PLAN.md). */
export function LandingRestaurants() {
  return (
    <section className="lp-section">
      <div className="card c-sky lp-restaurant">
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Muy pronto</span>
          <h2>¿Tienes restaurante con mesas?</h2>
          <p>
            Estamos construyendo Destello para restaurantes: el mesero toma el pedido en su celular, la cocina lo ve al
            instante con un reloj y nadie se olvida de la mesa 7. Déjanos tu WhatsApp y te avisamos primero.
          </p>
        </div>
        <a className="btn ghost" href={contactHref(RESTAURANT_MESSAGE)}>Avísame cuando esté</a>
      </div>
    </section>
  )
}

/** Descarga directa (sin Play Store ni App Store, decisión de Julieth): APK en Android, la web instalada en iPhone. */
export function LandingInstall() {
  return (
    <section className="lp-section" id="descargar">
      <span className="eyebrow">Descarga la app</span>
      <h2>Tenlo a un toque en tu celular.</h2>
      <p className="lp-sub">Destello no está en Play Store ni en App Store: lo descargas directo desde aquí.</p>
      <div className="lp-grid2">
        <article className="card c-banana lp-install">
          <div className="lp-install-head">
            <h3>Android</h3>
            <span className="chip white">Archivo .apk</span>
          </div>
          {ANDROID_APK_URL ? (
            <a className="btn primary block" href={ANDROID_APK_URL} download>
              <Icon name="download" />
              Descargar Destello para Android
            </a>
          ) : (
            <span className="btn primary block lp-soon" aria-disabled="true">
              <Icon name="download" />
              Descarga muy pronto
            </span>
          )}
          <ol>
            <li>Toca <b>Descargar</b> y abre el archivo cuando termine.</li>
            <li>Si Android pregunta, elige <b>Permitir de esta fuente</b> (solo la primera vez).</li>
            <li>Toca <b>Instalar</b> y busca la galleta de Destello en tu pantalla.</li>
          </ol>
          <p className="small muted">Mientras tanto: abre Destello en Chrome, toca <b>⋮</b> y elige <b>Instalar app</b>.</p>
        </article>
        <article className="card lp-install">
          <div className="lp-install-head">
            <h3>iPhone</h3>
            <span className="chip">Desde Safari</span>
          </div>
          <p>Apple no deja instalar apps fuera de la App Store, así que en iPhone Destello se agrega a tu pantalla de inicio y funciona igual que una app.</p>
          <ol>
            <li>Abre Destello en <b>Safari</b>.</li>
            <li>Toca <b>Compartir</b> (el cuadro con la flecha hacia arriba).</li>
            <li>Elige <b>Agregar a pantalla de inicio</b>.</li>
          </ol>
        </article>
      </div>
    </section>
  )
}

const FAQ = [
  ["¿Mis clientas tienen que instalar algo?", "No. Te siguen escribiendo a tu WhatsApp de siempre; tú anotas el pedido en Destello."],
  ["¿Sirve si no hago galletas?", "Sí. Funciona con todo lo que se hace con una receta en gramos: tortas, panes, rollos, postres y comida de cocinas ocultas."],
  ["¿Necesito computador?", "No. Todo el panel funciona en el celular. Si tienes computador, también lo puedes usar ahí."],
  ["¿Qué pasa con mis datos?", "Son de tu negocio y no se los compartimos a nadie. Si dejas de usar Destello, los guardamos 6 meses por si vuelves y luego se borran."],
  ["¿Y si se me olvida pagar?", "Te avisamos antes de que venza y tienes un día de gracia. Tus datos no se pierden: el panel solo queda en pausa hasta que pagues."],
] as const

export function LandingFaq() {
  return (
    <section className="lp-section">
      <span className="eyebrow">Preguntas frecuentes</span>
      <h2>Lo que más nos preguntan.</h2>
      <div className="lp-faq">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <Icon name="down" size={20} />
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function LandingContact() {
  return (
    <section className="lp-section" id="contacto">
      <div className="card c-accent lp-cta">
        <div className="lp-cta-plate" aria-hidden="true">
          <Cookie size={48} />
          <Cookie look="choco" size={48} />
          <Cookie look="bread" size={48} />
        </div>
        <h2>Prueba Destello 15 días gratis.</h2>
        <p>Escríbenos y dejamos tu cocina lista para empezar mañana.</p>
        <a className="btn ghost" href={contactHref(TRIAL_MESSAGE)}>Quiero probarlo</a>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-brand">
        <Cookie size={28} />
        <b>Destello</b>
      </div>
      <nav aria-label="Documentos legales">
        <Link href="/terminos">Términos</Link>
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/reembolsos">Reembolsos</Link>
        <Link href="/access">Entrar</Link>
      </nav>
      <p className="small muted">© {new Date().getFullYear()} Destello · Hecho en Colombia</p>
    </footer>
  )
}
