import { Cookie } from "@/components/ui/cookie"
import { Icon } from "@/components/ui/icon"

// ── Página de presentación: el problema, cómo lo resuelve, la voz, el video y los precios ──
// Ejemplos con números que cuadran con el panel (caja x9: cuesta $3.850, se vende en $20.000).

const PROBLEMS = [
  ["c-strawberry", "Los pedidos se pierden entre chats", "Te escriben por WhatsApp, por Instagram y en persona. A la noche ya no sabes cuántas cajas son para mañana ni cuál era con domicilio."],
  ["c-lilac", "Cada noche haces cuentas", "Sumas pedidos en un papel para saber cuánta masa preparar. Si te pasas, se pierde; si te quedas corta, alguien se queda sin su caja."],
  ["c-peach", "Vendes, pero no sabes cuánto ganas", "Subió la mantequilla, la caja y el sticker. ¿Esa caja de $ 20.000 todavía deja plata o ya la estás regalando?"],
] as const

export function LandingProblem() {
  return (
    <section className="lp-section">
      <span className="eyebrow">Lo que pasa en una cocina pequeña</span>
      <h2>Haces todo bien en la cocina. Lo difícil es todo lo demás.</h2>
      <div className="lp-grid3">
        {PROBLEMS.map(([color, title, text]) => (
          <article className={`card ${color} lp-problem`} key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

const STEPS = [
  {
    icon: "pedidos",
    title: "Anotas el pedido",
    text: "Quién, qué, para qué día y si es domicilio. Tu clienta te sigue escribiendo a tu WhatsApp de siempre.",
    example: "Laura · Caja x9 galletas con chips · sábado · domicilio",
  },
  {
    icon: "produccion",
    title: "Destello calcula la producción",
    text: "Suma todos los pedidos del día, usa primero la masa que ya tienes guardada y te dice cuánto hacer.",
    example: "Masa de chips: necesitas 1,2 kg; 850 g salen del lote. Haz 350 g.",
  },
  {
    icon: "insumos",
    title: "Te avisa qué comprar",
    text: "Cada producción descuenta harina, mantequilla, cajas y stickers. Si algo no alcanza, lo sabes antes de empezar.",
    example: "Chips de chocolate: quedan 1,8 kg, el mínimo es 2 kg.",
  },
  {
    icon: "analitica",
    title: "Sabes cuánto ganas",
    text: "Con lo que pagaste por cada insumo, Destello saca el costo de cada caja y te dice si el precio está bien.",
    example: "Caja x9: cuesta $ 3.850, la vendes en $ 20.000. Te queda el 81 %.",
  },
] as const

export function LandingHow() {
  return (
    <section className="lp-section" id="como-funciona">
      <span className="eyebrow">Cómo funciona</span>
      <h2>Del pedido a la ganancia, sin cuadernos.</h2>
      <ol className="lp-steps">
        {STEPS.map((s, i) => (
          <li className="card lp-step" key={s.title}>
            <div className="lp-step-head">
              <span className="lp-step-n">{i + 1}</span>
              <Icon name={s.icon} size={22} />
            </div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <p className="lp-example">{s.example}</p>
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
        <div className="lp-voice-mic" aria-hidden="true"><Icon name="mic" size={30} /></div>
        <div className="stack" style={{ gap: 10 }}>
          <span className="eyebrow">Con las manos en la masa</span>
          <h2>«Oye Destello, ¿cuántas galletas hago mañana?»</h2>
          <p>Pregúntale en voz alta mientras cocinas y te responde: qué hornear, qué falta, quién reparte o qué se vende más. Sin tocar la pantalla con las manos llenas de harina.</p>
          <p className="small muted">Funciona en Chrome y Edge, con el panel abierto.</p>
        </div>
      </div>
    </section>
  )
}

/** Espacio para el video "Cómo funciona": se llena cuando esté grabado. */
export function LandingVideo() {
  return (
    <section className="lp-section">
      <span className="eyebrow">Míralo en 2 minutos</span>
      <h2>Una noche en una pastelería con Destello.</h2>
      <div className="lp-video" role="img" aria-label="Aquí irá el video de cómo funciona Destello">
        <div className="lp-video-plate" aria-hidden="true">
          <Cookie size={56} />
          <Cookie look="choco" size={56} />
          <Cookie look="roll" size={56} />
        </div>
        <b>Video muy pronto</b>
        <span className="small muted">Mientras tanto, escríbenos y te lo mostramos en vivo.</span>
      </div>
    </section>
  )
}

/** Espacio para los precios: el valor del plan sigue por confirmar. */
export function LandingPricing() {
  return (
    <section className="lp-section" id="precios">
      <span className="eyebrow">Precios</span>
      <h2>Empieza gratis. Paga solo si te sirve.</h2>
      <div className="lp-grid2">
        <article className="card c-banana lp-plan">
          <h3>Prueba gratis</h3>
          <p className="lp-price">15 días</p>
          <ul>
            <li>Todo el panel</li>
            <li>Sin tarjeta</li>
            <li>Te ayudamos a cargar tus recetas</li>
          </ul>
        </article>
        <article className="card lp-plan lp-plan-soon">
          <h3>Plan mensual</h3>
          <p className="lp-price">Muy pronto</p>
          <ul>
            <li>Pagas con tarjeta, PSE, Nequi o Bancolombia</li>
            <li>Cada pago te da 30 días más; si no pagas, no se cobra nada</li>
          </ul>
        </article>
      </div>
    </section>
  )
}
