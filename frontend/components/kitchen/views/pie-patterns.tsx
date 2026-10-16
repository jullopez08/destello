// Tajadas de la torta de Analítica dibujadas como un pastel plano (estilo
// dibujo): bizcocho, una franja de relleno y glaseado que chorrea por encima,
// con decoraciones sencillas. Solo colores lisos: sin degradados, sombras ni
// filtros, que en el celular se ven pixelados y cuestan más de dibujar.

export type Topping = { id: string; icing: string; cake: string; filling: string; decor: string[]; kind: "chips" | "sprinkles" | "dots" | "none" }

export const TOPPINGS: Topping[] = [
  { id: "chocolate", icing: "#6b3a22", cake: "#f2b673", filling: "#fff3d6", decor: ["#fff3d6"], kind: "chips" },
  { id: "fresa", icing: "#f48fb1", cake: "#fbe3c8", filling: "#e8567f", decor: ["#fff6f8"], kind: "dots" },
  { id: "confeti", icing: "#b39ddb", cake: "#f6d7a7", filling: "#fff6f8", decor: ["#ffd23f", "#fff6f8", "#8fd3b0", "#f48fb1"], kind: "sprinkles" },
  { id: "canela", icing: "#fff3d6", cake: "#d9a066", filling: "#8a5a3c", decor: ["#a0662f"], kind: "chips" },
  { id: "menta", icing: "#8fd3b0", cake: "#6b3a22", filling: "#fff3d6", decor: ["#fff6f8", "#6b3a22"], kind: "dots" },
]
export const REST_TOPPING: Topping = { id: "migas", icing: "#eadfc8", cake: "#d8c4a0", filling: "#fff3d6", decor: ["#b8925f"], kind: "none" }

export const R = 92 // borde de la torta
export const IN = 52 // hueco del centro
const ICE = 76 // donde empieza el glaseado
const FILL = 63 // franja de relleno

const at = (a: number, r: number) => `${(100 + r * Math.sin(a)).toFixed(2)} ${(100 - r * Math.cos(a)).toFixed(2)}`

export function ringPath(start: number, end: number, outer = R, inner = IN) {
  if (end - start >= Math.PI * 2 - 1e-6) end = start + Math.PI * 2 - 1e-4
  const large = end - start > Math.PI ? 1 : 0
  return `M${at(start, outer)} A${outer} ${outer} 0 ${large} 1 ${at(end, outer)} L${at(end, inner)} A${inner} ${inner} 0 ${large} 0 ${at(start, inner)} Z`
}

// Glaseado: el borde de afuera es la orilla de la torta y el de adentro
// chorrea en gotas redondas.
function icingPath(start: number, end: number) {
  const steps = Math.max(8, Math.ceil((end - start) / 0.02))
  const drip = (a: number) => ICE - 7 * Math.pow(Math.max(0, Math.sin(a * 11)), 3)
  const inner = Array.from({ length: steps + 1 }, (_, i) => end - ((end - start) * i) / steps).map((a) => `L${at(a, drip(a))}`)
  const large = end - start > Math.PI ? 1 : 0
  return `M${at(start, R)} A${R} ${R} 0 ${large} 1 ${at(end, R)} ${inner.join(" ")} Z`
}

// Decoraciones repartidas por el glaseado, siempre en el mismo lugar.
function decorations(t: Topping, start: number, end: number) {
  if (t.kind === "none") return null
  const n = Math.max(1, Math.floor((end - start) / 0.17))
  return Array.from({ length: n }, (_, i) => {
    const a = start + ((end - start) * (i + 0.5)) / n
    const r = i % 2 ? 84 : 88
    const [x, y] = [100 + r * Math.sin(a), 100 - r * Math.cos(a)]
    const color = t.decor[i % t.decor.length]
    if (t.kind === "sprinkles") {
      return <rect key={i} x={x - 3.5} y={y - 1.2} width="7" height="2.4" rx="1.2" fill={color} transform={`rotate(${(i * 67) % 180} ${x} ${y})`} />
    }
    if (t.kind === "chips") return <path key={i} d={`M${x - 2.2} ${y + 1.4} q2.2 -4.6 4.4 0 z`} fill={color} />
    return <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.5} fill={color} />
  })
}

// Una tajada completa: bizcocho, relleno, glaseado y decoración.
export function SliceDrawing({ t, start, end }: { t: Topping; start: number; end: number }) {
  return (
    <>
      <path d={ringPath(start, end)} fill={t.cake} className="base" />
      <path d={ringPath(start, end, FILL + 2.5, FILL - 2.5)} fill={t.filling} />
      <path d={icingPath(start, end)} fill={t.icing} />
      {decorations(t, start, end)}
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
