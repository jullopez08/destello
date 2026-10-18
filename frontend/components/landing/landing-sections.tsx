import { Cookie } from "@/components/ui/cookie"
import { Icon } from "@/components/ui/icon"
import { contactHref, RESTAURANT_MESSAGE } from "@/lib/contact"

// ── Página de presentación: tipos de negocio, el problema, cómo funciona y la voz ──
// Tarjetas tipo "sabor" (referencia OLIPOP): un círculo ilustrado, un título y una sola frase.
// Los ejemplos cuadran con el panel (caja x9: cuesta $3.850, se vende en $20.000 → 81 %).

const SEGMENTS = [
  { look: "choco", color: "c-banana", title: "Pastelerías y reposterías", text: "Cajas, tortas por tamaño y ediciones de temporada." },
  { look: "bread", color: "c-peach", title: "Panaderías", text: "Masas por lote y lo que sale del horno cada día." },
  { look: "pizza", color: "c-strawberry", title: "Cocinas ocultas y domicilios", text: "Pedidos del día, repartidores y el costo de cada plato." },
  { look: "plate", color: "c-lilac", title: "Restaurantes con mesas", text: "Comandas con reloj para que ninguna mesa espere.", soon: true },
]

export function LandingSegments() {
  return (
    <section className="lp-section lp-center">
      <span className="eyebrow">Para quién es</span>
      <h2>Hecho para cocinas como la tuya.</h2>
      <div className="lp-flavors">
        {SEGMENTS.map((s) => (
          <article className={`card ${s.color} lp-flavor`} key={s.title}>
            <Cookie look={s.look} size={88} />
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            {s.soon ? (
              <a className="lp-soon-link" href={contactHref(RESTAURANT_MESSAGE)}>
                <span className="chip white">Muy pronto</span> Avísame
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

const PROBLEMS = [
  ["pedidos", "Pedidos regados", "Entre WhatsApp, Instagram y el cuaderno."],
  ["produccion", "Cuentas cada noche", "Cuánto preparar, calculado a mano."],
  ["analitica", "Ganancia a ciegas", "Subieron los insumos: ¿ese precio todavía deja?"],
] as const

export function LandingProblem() {
  return (
    <section className="lp-section lp-center">
      <span className="eyebrow">Lo que pasa en una cocina</span>
      <h2>Lo difícil no es cocinar.</h2>
      <div className="lp-grid3">
        {PROBLEMS.map(([icon, title, text]) => (
          <article className="lp-problem" key={title}>
            <span className="lp-circle" aria-hidden="true"><Icon name={icon} size={26} /></span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  ["Anotas el pedido", "Andrés · 2 hamburguesas dobles · hoy · domicilio"],
  ["Sabes qué producir", "Masa de chips: haz 350 g; 850 g salen del lote."],
  ["Sabes qué comprar", "Chips de chocolate: quedan 1,8 kg y el mínimo es 2 kg."],
  ["Sabes cuánto ganas", "Caja x9: cuesta $ 3.850 y la vendes en $ 20.000. Te queda el 81 %."],
] as const

export function LandingHow() {
  return (
    <section className="lp-section lp-center" id="como-funciona">
      <span className="eyebrow">Cómo funciona</span>
      <h2>Del pedido a la ganancia, sin cuadernos.</h2>
      <ol className="lp-steps">
        {STEPS.map(([title, example], i) => (
          <li className="card lp-step" key={title}>
            <span className="lp-step-n">{i + 1}</span>
            <h3>{title}</h3>
            <p className="lp-example">{example}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function LandingVoice() {
  return (
    <section className="lp-section">
      <div className="card c-banana lp-voice">
        <div className="lp-voice-mic" aria-hidden="true"><Icon name="mic" size={34} /></div>
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Con las manos ocupadas</span>
          <h2>«Oye Destello, ¿qué me falta para mañana?»</h2>
          <p>Pregúntale en voz alta mientras cocinas y te responde.</p>
          <p className="small muted">En Chrome y Edge, con el panel abierto.</p>
        </div>
      </div>
    </section>
  )
}
