import { NextRequest, NextResponse } from "next/server"

// Reenvía todo /api/* al backend con un fetch propio (copiado de aggendarme):
// - el navegador nunca ve la URL interna del backend (un rewrite externo de
//   Next filtra la cabecera x-middleware-rewrite al cliente);
// - se conserva X-Forwarded-For, que los throttlers del backend necesitan.
// Una ruta app/api/... de Next nunca se ejecuta: este proxy la toma antes.
export async function proxy(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3101"
  const destination = new URL(request.nextUrl.pathname.replace(/^\/api/, "") + request.nextUrl.search, backendUrl)

  const headers = new Headers(request.headers)
  headers.set("host", destination.host)

  const hasBody = request.method !== "GET" && request.method !== "HEAD"

  let backendResponse: Response
  try {
    backendResponse = await fetch(destination, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    })
  } catch {
    return NextResponse.json(
      { message: "No se pudo conectar con el servidor. Inténtalo de nuevo en unos momentos." },
      { status: 502 },
    )
  }

  // Solo las cabeceras que mandó el backend: nada interno de Next se cuela.
  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: new Headers(backendResponse.headers),
  })
}

export const config = {
  matcher: "/api/:path*",
}
