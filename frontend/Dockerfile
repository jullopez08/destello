# Panel de Destello para producción (Railway). Local se sigue usando Dockerfile.dev.
FROM node:22-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.15.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Las NEXT_PUBLIC_* quedan escritas en el panel al armarlo: en Railway van como variables del servicio.
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_CONTACT_WHATSAPP
ARG NEXT_PUBLIC_ANDROID_APK_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3100
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3100
# BACKEND_URL (solo servidor) se lee al correr: en Railway, la dirección privada del backend.
CMD ["node", "server.js"]
