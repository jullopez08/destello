import { Cookie } from "@/components/ui/cookie"

// ── Página de presentación: espacio del video y precios (los dos por llenar) ──

export function LandingVideo() {
  return (
    <section className="lp-section lp-center">
      <span className="eyebrow">Míralo en 2 minutos</span>
      <h2>Un día de cocina con Destello.</h2>
      <div className="lp-video" role="img" aria-label="Aquí irá el video de cómo funciona Destello">
        <div className="lp-video-plate" aria-hidden="true">
          <Cookie size={56} />
          <Cookie look="pizza" size={56} />
          <Cookie look="plate" size={56} />
        </div>
        <b>Video muy pronto</b>
        <span className="small muted">Mientras tanto, escríbenos y te lo mostramos en vivo.</span>
      </div>
    </section>
  )
}

export function LandingPricing() {
  return (
    <section className="lp-section lp-center" id="precios">
      <span className="eyebrow">Precios</span>
      <h2>Empieza gratis. Paga solo si te sirve.</h2>
      <div className="lp-grid2">
        <article className="card c-banana lp-plan">
          <h3>Prueba gratis</h3>
          <p className="lp-price">15 días</p>
          <ul>
            <li>Todo el panel</li>
            <li>Sin tarjeta</li>
            <li>Te ayudamos a empezar</li>
          </ul>
        </article>
        <article className="card lp-plan lp-plan-soon">
          <h3>Plan mensual</h3>
          <p className="lp-price">Muy pronto</p>
          <ul>
            <li>Tarjeta, PSE, Nequi o Bancolombia</li>
            <li>Si no pagas, no se cobra nada</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
