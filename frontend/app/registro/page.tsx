import type { Metadata } from "next"
import { SignupScreen } from "@/components/access/signup-screen"

export const metadata: Metadata = {
  title: "Prueba gratis · Destello",
  description: "Crea la cuenta de tu negocio y prueba Destello 15 días gratis, sin tarjeta.",
}

export default function SignupPage() {
  return <SignupScreen />
}
