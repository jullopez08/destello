import type { Metadata } from "next"
import { LandingHero, LandingNav } from "@/components/landing/landing-hero"
import { LandingHow, LandingPricing, LandingProblem, LandingVideo, LandingVoice } from "@/components/landing/landing-sections"
import { LandingContact, LandingFaq, LandingFooter, LandingInstall, LandingRestaurants } from "@/components/landing/landing-extra"
import "./styles/landing.css"

// Página de presentación (Fase 1). El panel sigue en /access; la app instalada abre directo ahí (manifest).
export const metadata: Metadata = {
  title: "Destello · Deja de adivinar cuánto hornear",
  description: "Pedidos, producción, insumos y ganancia de cada venta para pastelerías, panaderías y cocinas ocultas. Desde el celular.",
}

export default function Home() {
  return (
    <div className="lp">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingHow />
        <LandingVoice />
        <LandingVideo />
        <LandingPricing />
        <LandingRestaurants />
        <LandingInstall />
        <LandingFaq />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  )
}
