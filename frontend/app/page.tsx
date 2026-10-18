import type { Metadata } from "next"
import { LandingHero, LandingNav } from "@/components/landing/landing-hero"
import { LandingHow, LandingProblem, LandingSegments, LandingVoice } from "@/components/landing/landing-sections"
import { LandingPricing, LandingVideo } from "@/components/landing/landing-offer"
import { LandingContact, LandingFaq, LandingFooter, LandingInstall } from "@/components/landing/landing-extra"
import "./styles/landing.css"

// Página de presentación (Fase 1). El panel sigue en /access; la app instalada abre directo ahí (manifest).
export const metadata: Metadata = {
  title: "Destello · Tu cocina, en orden",
  description: "Pedidos, producción, insumos y ganancia de cada venta para pastelerías, panaderías, cocinas ocultas y negocios de comida. Desde el celular.",
}

export default function Home() {
  return (
    <div className="lp">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingSegments />
        <LandingProblem />
        <LandingHow />
        <LandingVoice />
        <LandingVideo />
        <LandingPricing />
        <LandingInstall />
        <LandingFaq />
        <LandingContact />
      </main>
      <LandingFooter />
    </div>
  )
}
