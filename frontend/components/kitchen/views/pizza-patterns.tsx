import { IN, R, ringPath } from "./pie-patterns"

// La torta de Analítica para los negocios de comida (Julieth, 2026-10-21): una pizza vista desde arriba. El borde de
// masa dorada, el queso teñido del color de su ingrediente y trocitos de ese ingrediente encima; cada tajada lleva
// uno distinto. El centro queda libre para el texto, como la dona.

const CRUST = "#e9a64a"
const CRUST_RIM = "#c98642"

// Ingredientes: color del trocito y del queso de esa tajada.
const TOPPINGS: [string, string][] = [
  ["#d8452f", "#ffd9a8"], // tomate
  ["#5fae4a", "#f4f0b8"], // albahaca
  ["#f29bb0", "#ffe3c4"], // jamón
  ["#ffd23f", "#fff0b0"], // piña
  ["#b07cc6", "#f6e2f0"], // cebolla morada
  ["#c9a27e", "#fbeed6"], // champiñón
  ["#e9784f", "#ffe2c6"], // pimentón
  ["#8cc56a", "#eaf5c8"], // pimiento verde
  ["#7fc4e8", "#e2f2fa"], // queso azul
  ["#f6a96c", "#ffe8cc"], // maíz
]

export function toppingFor(i: number): [string, string] {
  if (i < TOPPINGS.length) return TOPPINGS[i]
  const hue = Math.round((i * 137.5) % 360)
  return [`hsl(${hue} 60% 50%)`, `hsl(${hue} 70% 88%)`]
}

const at = (a: number, r: number): [number, number] => [100 + r * Math.sin(a), 100 - r * Math.cos(a)]

export function PizzaSlice({ i, start, end }: { i: number; start: number; end: number }) {
  const [bit, cheese] = toppingFor(i)
  // Trocitos repartidos en dos anillos, según lo ancha que sea la tajada.
  const bits: [number, number][] = []
  for (const r of [IN + 10, IN + 24]) {
    const n = Math.max(1, Math.floor(((end - start) * r) / 16))
    for (let k = 0; k < n; k++) bits.push(at(start + ((end - start) * (k + 0.5 + (r === IN + 10 ? 0 : 0.25))) / (n + 0.25), r))
  }
  return (
    <>
      <path d={ringPath(start, end, R - 9, IN)} fill={cheese} className="base" />
      <path d={ringPath(start, end, R, R - 9)} fill={CRUST} />
      <path d={ringPath(start, end, R, R - 2.5)} fill={CRUST_RIM} />
      {bits.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={k % 2 ? 4 : 5} fill={bit} />)}
      <path d={`M${at(start, IN).join(" ")} L${at(start, R).join(" ")}`} stroke="#fff6e5" strokeWidth="1.6" />
    </>
  )
}

// Hoja de albahaca encima de la tajada que se toca (en la dona es una cereza).
export function Basil({ angle }: { angle: number }) {
  const [x, y] = at(angle, R - 4)
  const deg = (angle * 180) / Math.PI
  return (
    <g className="cherry" transform={`rotate(${deg} ${x} ${y})`}>
      <ellipse cx={x} cy={y} rx="4.4" ry="7.5" fill="#4f9a3a" />
      <path d={`M${x} ${y - 6} L${x} ${y + 6}`} stroke="#a8d98a" strokeWidth="1" />
    </g>
  )
}
