import Link from "next/link"
import { Cookie } from "@/components/ui/cookie"

// Lado ilustrado de la entrada, el registro y las pantallas de espera.
export function Art() {
  return (
    <section className="art">
      <div>
        <div className="eyebrow" style={{ color: "inherit", opacity: 0.7 }}>Panel de la cocina</div>
        <h1 style={{ marginTop: 10 }}><Link href="/" className="home-link" title="Ir a la página de Destello">Destello</Link></h1>
        <p>Pedidos del día, producción, inventario por peso y proveedores. Todo en un solo lugar.</p>
      </div>
      <div className="plate" aria-hidden="true">
        <Cookie />
        <Cookie look="choco" />
        <Cookie look="roll" />
        <Cookie look="bread" />
      </div>
    </section>
  )
}
