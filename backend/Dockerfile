# Backend de Destello para producción (Railway). Local se sigue usando Dockerfile.dev.
# Dos etapas: se compila con todas las dependencias y se corre solo con las de producción.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./
# Sin root: si alguien rompe la app, no es dueño del contenedor.
USER node
EXPOSE 3101
# Cada despliegue aplica las migraciones pendientes antes de arrancar.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
