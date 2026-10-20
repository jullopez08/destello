import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"
import { Icon } from "@/components/ui/icon"

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
        {/* Secundario: quien ya tiene cuenta. Principal: quien llega a conocer Destello. */}
        <Link href="/access" className="btn ghost sm">Entrar</Link>
        <a href="#descargar" className="btn primary sm">
          <Icon name="download" />
          Descargar
        </a>
      </nav>
    </header>
  )
}

/** Portada como afiche pastel sobre papel crema (referencia OLIPOP). Titular de resultado, para todo negocio de comida. */
export function LandingHero() {
  return (
    <section className="lp-hero">
      <div className="lp-hero-text">
        <span className="eyebrow">Para negocios de comida</span>
        <h1>Tu cocina, en orden.</h1>
        <p className="lp-lead">Anota los pedidos y Destello te dice qué producir, qué comprar y cuánto ganas en cada venta.</p>
        <div className="lp-actions">
          <Link className="btn primary" href="/registro">Probar 15 días gratis</Link>
          <a className="btn ghost" href="#como-funciona">Ver cómo funciona</a>
        </div>
        <p className="small lp-trust">Sin tarjeta · Desde el celular · Te ayudamos a empezar</p>
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
        <Cookie look="pizza" size={44} />
        <div>
          <b>8 pizzas medianas</b>
          <span className="small muted">Para 5 pedidos de domicilio</span>
        </div>
        <span className="chip ok">Listo</span>
      </div>
      <div className="lp-preview-alert">
        <b>Te faltan chips de chocolate:</b> 400 g. Compra antes de producir.
      </div>
    </div>
  )
}
