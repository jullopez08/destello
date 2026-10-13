import type { Metadata, Viewport } from "next"
import { Bagel_Fat_One, DM_Sans } from "next/font/google"
import "./globals.css"

const display = Bagel_Fat_One({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" })
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: "Destello · Panel de la cocina",
  description: "Pedidos del día, producción, inventario por peso y proveedores para pastelerías, panaderías y cocinas ocultas.",
}

export const viewport: Viewport = {
  themeColor: "#fff7e6",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`} data-palette="vainilla">
      <body>{children}</body>
    </html>
  )
}
