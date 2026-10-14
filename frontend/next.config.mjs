/** @type {import('next').NextConfig} */
const nextConfig = {
  // No anunciar "X-Powered-By: Next.js".
  poweredByHeader: false,
  // Solo en desarrollo: abrir el panel desde un celular de la misma red wifi
  // (http://<IP del computador>:3100). Sin esto, Next bloquea sus archivos de desarrollo.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },

  // /api/* lo reenvía proxy.ts al backend (BACKEND_URL, solo servidor): el
  // navegador solo habla con este origen y la cookie httpOnly viaja sola.
  // Estas cabeceras van en todo menos /api (el backend pone las suyas con helmet).
  async headers() {
    const isDev = process.env.NODE_ENV === "development"
    return [
      {
        source: "/((?!api|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              // 'unsafe-inline': Next lo necesita para su script de hidratación.
              // checkout.wompi.co es el widget de pago (WompiCheckout).
              `script-src 'self' 'unsafe-inline' https://checkout.wompi.co${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline'",
              // Logos de las pastelerías en Cloudinary
              "img-src 'self' data: blob: https://res.cloudinary.com",
              // Fuentes: next/font las sirve desde este mismo dominio
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "connect-src 'self' https://checkout.wompi.co https://sandbox.wompi.co https://production.wompi.co",
              "frame-src https://checkout.wompi.co",
              ...(isDev ? [] : ["upgrade-insecure-requests"]),
            ].join("; "),
          },
        ],
      },
    ]
  },
}

export default nextConfig
