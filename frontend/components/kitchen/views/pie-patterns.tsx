// Diseños de repostería para las tajadas de la torta de Analítica. Cada uno es
// un relleno SVG que se repite: color de base, decoración y el mismo café
// oscuro (#3d2417) de los bordes de Destello. No son las figuras de galleta del
// panel: son coberturas propias para que cada tajada se distinga de un vistazo.

const INK = "#3d2417"

// Los ids van con el prefijo de la torta para no chocar con otros SVG de la página.
export const PATTERN_IDS = ["torta-chispas", "torta-glaseado", "torta-confeti", "torta-espiral", "torta-lunares", "torta-migas"] as const

export function PiePatterns() {
  return (
    <defs>
      {/* 1 · Chispas de chocolate sobre masa durazno */}
      <pattern id="torta-chispas" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#f6a96c" />
        <path d="M5 4 q2 -3 4 0 q-2 3 -4 0z" fill="#4e2817" />
        <path d="M15 11 q2 -3 4 0 q-2 3 -4 0z" fill="#4e2817" />
        <path d="M4 16 q2 -3 4 0 q-2 3 -4 0z" fill="#4e2817" />
        <circle cx="13" cy="3" r="1.2" fill="#fff4e0" />
        <circle cx="10" cy="19" r="1.2" fill="#fff4e0" />
      </pattern>

      {/* 2 · Glaseado de fresa: rosado con olas de crema */}
      <pattern id="torta-glaseado" width="24" height="14" patternUnits="userSpaceOnUse">
        <rect width="24" height="14" fill="#f48fb1" />
        <path d="M0 5 q6 -5 12 0 t12 0" fill="none" stroke="#fff6f8" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M0 11 q6 -5 12 0 t12 0" fill="none" stroke="#c2334f" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      </pattern>

      {/* 3 · Confeti: lavanda con chispitas de colores */}
      <pattern id="torta-confeti" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#b39ddb" />
        <rect x="3" y="3" width="6" height="2" rx="1" fill="#ffd23f" transform="rotate(35 6 4)" />
        <rect x="12" y="6" width="6" height="2" rx="1" fill="#fff6f8" transform="rotate(-25 15 7)" />
        <rect x="4" y="13" width="6" height="2" rx="1" fill="#8fd3b0" transform="rotate(-50 7 14)" />
        <rect x="13" y="15" width="6" height="2" rx="1" fill="#f48fb1" transform="rotate(15 16 16)" />
      </pattern>

      {/* 4 · Espiral de canela: cielo con remolinos */}
      <pattern id="torta-espiral" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#7fc4e8" />
        <path d="M11 11 m0 -1.5 a1.5 1.5 0 1 1 -1.5 1.5 a3.5 3.5 0 1 1 3.5 3.5 a5.5 5.5 0 1 1 -5.5 -5.5" fill="none" stroke="#fffaf0" strokeWidth="1.6" strokeLinecap="round" />
      </pattern>

      {/* 5 · Lunares: menta con puntos de crema y de chocolate */}
      <pattern id="torta-lunares" width="16" height="16" patternUnits="userSpaceOnUse">
        <rect width="16" height="16" fill="#8fd3b0" />
        <circle cx="4" cy="4" r="2.4" fill="#fffaf0" />
        <circle cx="12" cy="12" r="2.4" fill="#fffaf0" />
        <circle cx="12" cy="4" r="1" fill={INK} />
        <circle cx="4" cy="12" r="1" fill={INK} />
      </pattern>

      {/* 6 · Lo demás: crema con migas */}
      <pattern id="torta-migas" width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#eadfc8" />
        <path d="M0 14 L14 0" stroke="#c9a77a" strokeWidth="1.2" />
        <circle cx="3" cy="4" r="0.9" fill="#a67c52" />
        <circle cx="10" cy="10" r="0.9" fill="#a67c52" />
      </pattern>
    </defs>
  )
}
