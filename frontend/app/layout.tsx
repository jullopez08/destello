import type { Metadata, Viewport } from "next"
import { Bagel_Fat_One, DM_Sans } from "next/font/google"
import "./globals.css"
import "./styles/pieces.css"
import "./styles/pages.css"
import "./styles/mobile.css"
import { NavMemory } from "@/components/ui/nav-memory"

const display = Bagel_Fat_One({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" })
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" })

export const metadata: Metadata = {
  title: "Destello · Panel de la cocina",
  description: "Pedidos del día, producción, inventario por peso y proveedores para pastelerías, panaderías y cocinas ocultas.",
  applicationName: "Destello",
  appleWebApp: { capable: true, title: "Destello", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
}

export const viewport: Viewport = {
  themeColor: "#fff7e6",
  // Ocupa toda la pantalla del celular; la barra de abajo respeta la zona segura (env(safe-area-inset-*)).
  viewportFit: "cover",
  // Con el teclado abierto la página se achica (no se desliza hacia arriba): las ventanas que suben desde
  // abajo quedan encima del teclado con Cancelar y Guardar completos (Android; el iPhone lo maneja solo).
  interactiveWidget: "resizes-content",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`} data-palette="vainilla">
      <body>
        <NavMemory />
        {children}
      </body>
    </html>
  )
}
