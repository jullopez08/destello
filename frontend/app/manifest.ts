import type { MetadataRoute } from "next"

// Para instalar Destello desde el navegador ("Agregar a la pantalla de inicio"):
// abre directo en el panel, a pantalla completa y con el ícono de la galleta.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Destello · Panel de la cocina",
    short_name: "Destello",
    description: "Pedidos del día, producción, inventario por peso y proveedores para pastelerías, panaderías y cocinas ocultas.",
    start_url: "/access#hoy",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7e6",
    theme_color: "#ffd23f",
    lang: "es-CO",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
