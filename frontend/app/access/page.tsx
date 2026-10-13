import type { Metadata } from "next"
import { AccessScreen } from "@/components/access/access-screen"

export const metadata: Metadata = {
  title: "Entrar · Destello",
  robots: { index: false, follow: false },
}

// Entrada y panel en una sola ruta: la sesión decide qué se muestra
// (login, términos, panel de la dueña o panel de la super admin).
export default function AccessPage() {
  return <AccessScreen />
}
