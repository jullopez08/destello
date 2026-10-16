// Coberturas de repostería para las tajadas de la torta de Analítica, en el
// estilo de las galletas del panel (.cookie): sin contornos duros, con el borde
// más tostado que el centro, sombra suave y decoraciones redondas y gorditas.
// Cada tajada tiene su base (degradado del centro al borde) y su decoración.

export type Topping = { id: string; base: string; light: string; rim: string; decor: "chips" | "glaze" | "sprinkles" | "rings" | "dots" | "crumbs" }

export const TOPPINGS: Topping[] = [
  { id: "chispas", base: "#f2a565", light: "#f8c08a", rim: "#d9843f", decor: "chips" },
  { id: "fresa", base: "#f48fb1", light: "#f9b3cb", rim: "#de6d93", decor: "glaze" },
  { id: "confeti", base: "#b39ddb", light: "#cdbdea", rim: "#9479c6", decor: "sprinkles" },
  { id: "canela", base: "#f4d6a8", light: "#f8e4c4", rim: "#d9ae6e", decor: "rings" },
  { id: "menta", base: "#8fd3b0", light: "#b3e3c9", rim: "#69bb92", decor: "dots" },
]
export const REST_TOPPING: Topping = { id: "migas", base: "#eadfc8", light: "#f3ebdb", rim: "#d3c19d", decor: "crumbs" }

// Degradado de horno: claro hacia el centro de la torta, tostado en el borde.
function Baked({ t }: { t: Topping }) {
  return (
    <radialGradient id={`torta-base-${t.id}`} cx="100" cy="100" r="94" gradientUnits="userSpaceOnUse">
      <stop offset="0.55" stopColor={t.light} />
      <stop offset="0.8" stopColor={t.base} />
      <stop offset="1" stopColor={t.rim} />
    </radialGradient>
  )
}

export function PiePatterns() {
  return (
    <defs>
      {[...TOPPINGS, REST_TOPPING].map((t) => <Baked key={t.id} t={t} />)}

      {/* Chispas de chocolate gorditas con su brillo, como la galleta clásica */}
      <pattern id="torta-decor-chips" width="26" height="26" patternUnits="userSpaceOnUse">
        <circle cx="6" cy="7" r="3" fill="#5a3220" />
        <circle cx="5" cy="6" r="0.9" fill="#8a5a3c" />
        <circle cx="18" cy="15" r="3.4" fill="#5a3220" />
        <circle cx="17" cy="14" r="1" fill="#8a5a3c" />
        <circle cx="8" cy="21" r="2.4" fill="#5a3220" />
      </pattern>

      {/* Glaseado: hilos de crema que caen en zigzag suave */}
      <pattern id="torta-decor-glaze" width="28" height="18" patternUnits="userSpaceOnUse">
        <path d="M0 6 q7 -6 14 0 t14 0" fill="none" stroke="#fff6f8" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <circle cx="21" cy="14" r="1.6" fill="#fff6f8" opacity="0.9" />
        <circle cx="6" cy="15" r="1.1" fill="#c2334f" opacity="0.5" />
      </pattern>

      {/* Chispitas de colores redonditas, pocas y grandes */}
      <pattern id="torta-decor-sprinkles" width="24" height="24" patternUnits="userSpaceOnUse">
        <rect x="3" y="4" width="8" height="3" rx="1.5" fill="#ffd23f" transform="rotate(35 7 5.5)" />
        <rect x="14" y="9" width="8" height="3" rx="1.5" fill="#fff6f8" transform="rotate(-30 18 10.5)" />
        <rect x="5" y="16" width="8" height="3" rx="1.5" fill="#f48fb1" transform="rotate(-55 9 17.5)" />
        <circle cx="19" cy="20" r="1.6" fill="#8fd3b0" />
      </pattern>

      {/* Lunares de crema con un punto de chocolate */}
      <pattern id="torta-decor-dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="3.2" fill="#fffaf0" />
        <circle cx="15" cy="15" r="3.2" fill="#fffaf0" />
        <circle cx="15" cy="5" r="1.3" fill="#5a3220" />
        <circle cx="5" cy="15" r="1.3" fill="#5a3220" />
      </pattern>

      {/* Migas sueltas */}
      <pattern id="torta-decor-crumbs" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1.4" fill="#b8925f" />
        <circle cx="11" cy="9" r="1" fill="#b8925f" />
        <circle cx="6" cy="13" r="1.2" fill="#c9a77a" />
      </pattern>

      {/* Sombra de la torta sobre el plato */}
      <filter id="torta-sombra" x="-10%" y="-10%" width="120%" height="125%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#784e14" floodOpacity="0.22" />
      </filter>
    </defs>
  )
}
