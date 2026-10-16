// La torta de Analítica dibujada como una dona glaseada (estilo dibujo, colores
// lisos): la masa dorada asoma en las orillas, cada tajada tiene su glaseado de
// borde ondulado y hilos de glaseado cruzados en un color que contrasta.
// Cada cosa vendida lleva un color distinto; si hay más que colores en la
// lista, se inventan más sin repetir (vuelta por el círculo de colores).

export const R = 92 // borde de la dona
export const IN = 52 // hueco del centro
const DOUGH = "#e9b86e"
const DOUGH_RIM = "#d79a4a"

// Glaseados: color de la cobertura y color de los hilos que van encima.
const GLAZES: [string, string][] = [
  ["#f06292", "#fff6f8"], // fresa
  ["#6b3a22", "#fff3d6"], // chocolate
  ["#fff3d6", "#6b3a22"], // vainilla
  ["#b39ddb", "#fff6f8"], // lavanda
  ["#8fd3b0", "#6b3a22"], // menta
  ["#ffd23f", "#c2334f"], // limón
  ["#7fc4e8", "#fff6f8"], // cielo
  ["#c2334f", "#fff3d6"], // frambuesa
  ["#f6a96c", "#6b3a22"], // durazno
  ["#c98642", "#fff3d6"], // caramelo
]

// Color de cada tajada según su lugar: nunca se repite.
export function glazeFor(i: number): [string, string] {
  if (i < GLAZES.length) return GLAZES[i]
  const hue = Math.round((i * 137.5) % 360)
  return [`hsl(${hue} 70% 72%)`, "#fff6f8"]
}

const at = (a: number, r: number) => `${(100 + r * Math.sin(a)).toFixed(2)} ${(100 - r * Math.cos(a)).toFixed(2)}`

export function ringPath(start: number, end: number, outer = R, inner = IN) {
  if (end - start >= Math.PI * 2 - 1e-6) end = start + Math.PI * 2 - 1e-4
  const large = end - start > Math.PI ? 1 : 0
  return `M${at(start, outer)} A${outer} ${outer} 0 ${large} 1 ${at(end, outer)} L${at(end, inner)} A${inner} ${inner} 0 ${large} 0 ${at(start, inner)} Z`
}

// Glaseado con orillas onduladas por dentro y por fuera, como en una dona.
function glazePath(start: number, end: number) {
  const steps = Math.max(6, Math.ceil((end - start) / 0.03))
  const angles = Array.from({ length: steps + 1 }, (_, i) => start + ((end - start) * i) / steps)
  const outer = angles.map((a) => at(a, 86 + 2.2 * Math.sin(a * 13)))
  const inner = [...angles].reverse().map((a) => at(a, 58 + 2 * Math.sin(a * 11 + 1)))
  return `M${outer.join(" L")} L${inner.join(" L")} Z`
}

// Hilos de glaseado: zigzag que cruza toda la dona; cada tajada lo recorta.
const DRIZZLE = Array.from({ length: 12 }, (_, i) => {
  const y = -10 + i * 20
  return `M-20 ${y} q20 -9 40 -1 t40 0 t40 -1 t40 0 t40 0 t40 0`
}).join(" ")

export function SliceDrawing({ i, start, end }: { i: number; start: number; end: number }) {
  const [glaze, drizzle] = glazeFor(i)
  const clip = `dona-clip-${i}`
  return (
    <>
      <path d={ringPath(start, end)} fill={DOUGH} className="base" />
      <path d={ringPath(start, end, R, R - 3)} fill={DOUGH_RIM} />
      <clipPath id={clip}>
        <path d={glazePath(start, end)} />
      </clipPath>
      <path d={glazePath(start, end)} fill={glaze} />
      <g clipPath={`url(#${clip})`}>
        <path d={DRIZZLE} transform="rotate(-20 100 100)" fill="none" stroke={drizzle} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </>
  )
}

// Cereza encima de la tajada que se toca.
export function Cherry({ angle }: { angle: number }) {
  const [x, y] = [100 + 86 * Math.sin(angle), 100 - 86 * Math.cos(angle)]
  return (
    <g className="cherry">
      <path d={`M${x} ${y - 4} q2 -7 7 -9`} fill="none" stroke="#4f8a3a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx={x} cy={y} r="5.6" fill="#d62f4b" />
      <circle cx={x - 1.8} cy={y - 1.8} r="1.6" fill="#ff9aab" />
    </g>
  )
}
