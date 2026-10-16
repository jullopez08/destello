import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { contactHref, TRIAL_MESSAGE } from "@/lib/contact"

// ── Página de presentación: barra de arriba y portada ──

export function LandingNav() {
  return (
    <header className="lp-nav">
      <Link href="/" className="lp-brand" aria-label="Destello, inicio">
        <Cookie size={34} />
        <b>Destello</b>
      </Link>
      <nav aria-label="Secciones">
        <a href="#como-funciona" className="only-desktop">Cómo funciona</a>
        <a href="#precios" className="only-desktop">Precios</a>
        <a href="#descargar" className="only-desktop">Descargar</a>
        <Link href="/access" className="btn ghost sm">Entrar</Link>
      </nav>
    </header>
  )
}

export function LandingHero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero-text">
        <span className="eyebrow">Para pastelerías, panaderías y cocinas ocultas</span>
        <h1>Deja de adivinar cuánto hornear.</h1>
        <p className="lp-lead">
          Anota los pedidos y Destello te dice cuánta masa hacer, qué te falta comprar y cuánto te queda de verdad en cada
          venta. Desde el celular, en tu cocina.
        </p>
        <div className="lp-actions">
          <a className="btn primary" href={contactHref(TRIAL_MESSAGE)}>Probar 15 días gratis</a>
          <a className="btn ghost" href="#como-funciona">Ver cómo funciona</a>
        </div>
        <p className="small muted">Sin tarjeta para la prueba. Funciona en el navegador del celular y del computador.</p>
      </div>
      <HeroPreview />
    </section>
  )
}

/** Vista de muestra del panel: lo que la dueña ve la noche antes. Datos de ejemplo. */
function HeroPreview() {
  return (
    <div className="lp-preview" aria-label="Ejemplo de lo que muestra Destello para mañana">
      <div className="lp-preview-head">
        <span className="small muted">Producción de mañana</span>
        <span className="chip banana">Sábado</span>
      </div>
      <div className="lp-preview-row">
        <Cookie size={44} />
        <div>
          <b>Masa de galleta con chips</b>
          <span className="small muted">Necesitas 1,2 kg · 850 g salen del lote</span>
        </div>
        <span className="chip warn">Hacer 350 g</span>
      </div>
      <div className="lp-preview-row">
        <Cookie look="roll" size={44} />
        <div>
          <b>6 rollos de canela</b>
          <span className="small muted">Para 2 pedidos de domicilio</span>
        </div>
        <span className="chip ok">Listo</span>
      </div>
      <div className="lp-preview-alert">
        <b>Te faltan chips de chocolate:</b> 400 g. Compra antes de producir.
      </div>
    </div>
  )
}
