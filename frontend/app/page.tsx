import { redirect } from "next/navigation"

// Por ahora no hay página de presentación: la raíz lleva a la entrada.
export default function Home() {
  redirect("/access")
}
