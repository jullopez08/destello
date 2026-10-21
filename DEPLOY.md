# Desplegar Destello en Railway (Fase 4)

Guía para el servidor de prueba, sin dominio propio (Railway da `*.up.railway.app` con https). Preparada el
2026-10-21 y probada en local con las mismas imágenes de Docker (base vacía, migraciones, planes, super admin,
entrada al panel y la IP real del visitante). Lo que solo se puede comprobar en Railway está en el paso 6.

## Cómo queda montado

```
navegador ──https──> borde de Railway ──> PANEL (frontend, Next.js)  ──red privada──> BACKEND (NestJS) ──> PostgreSQL
                                          dominio *.up.railway.app      sin dominio público
```

- El navegador solo habla con el panel. `proxy.ts` reenvía `/api/*` al backend por la red privada de Railway.
- El **backend no tiene dirección pública**: nadie de afuera lo alcanza directo. Wompi también entra por el panel.
- Cada despliegue del backend aplica solo las migraciones pendientes (`prisma migrate deploy`) antes de arrancar.

## 1. Proyecto y base de datos

1. Railway → **New Project → Deploy from GitHub repo** → `jullopez08/destello`, rama **`dev`** (o `main`
   cuando pase lo probado).
2. En el proyecto: **+ New → Database → PostgreSQL**. Se llama `Postgres`.

## 2. Servicio del backend

- **Settings → Source → Root Directory:** `backend` (usa `backend/Dockerfile` y `backend/railway.json`).
- **Settings → Networking:** **no** generar dominio público.
- Nombre del servicio: `backend` (la variable del panel en el paso 3 usa ese nombre).
- **Variables:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `PORT` | `3101` |
| `HOST` | `::` (la red privada de Railway pide escuchar en IPv6; con `::` también llega IPv4) |
| `TRUST_PROXY` | `1` (ver paso 6) |
| `JWT_SECRET` | una cadena larga al azar: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `JWT_EXPIRES_IN` | `1d` |
| `FRONTEND_URL` | la dirección del panel del paso 3, p. ej. `https://destello-panel.up.railway.app` (sin `/` al final) |
| `APP_TIMEZONE` | `America/Bogota` |
| `SIGNUP_MODE` | `review` mientras no haya dominio (ver paso 7) |
| `TURNSTILE_SECRET_KEY` | la secreta de Cloudflare Turnstile (vacío = sin captcha) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LEGAL_EMAIL` | de Resend (vacío = los correos solo quedan en el registro) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | de Cloudinary (logos) |
| `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` | de Wompi (vacío = pagos apagados, 503) |

## 3. Servicio del panel

- **+ New → GitHub Repo** → el mismo repositorio; **Root Directory:** `frontend`.
- **Settings → Networking → Generate Domain**, puerto **3100**. Esa dirección va en `FRONTEND_URL` del backend.
- **Variables:**

| Variable | Valor |
|---|---|
| `BACKEND_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:3101` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | la llave pública de Turnstile (va con la secreta del backend) |
| `NEXT_PUBLIC_CONTACT_WHATSAPP` | el WhatsApp de Destello, solo números con 57 (botones de contacto y "No pudimos comprobar tu negocio") |
| `NEXT_PUBLIC_ANDROID_APK_URL` | vacío hasta la Fase 10 |

Las `NEXT_PUBLIC_*` quedan escritas en el panel al armarlo: si se cambian, hay que volver a desplegar el panel.

## 4. Primer despliegue

1. Desplegar el backend y esperar "Nest application successfully started" en sus registros.
2. Desplegar el panel y abrir su dirección: debe salir la página de presentación.

## 5. Planes y cuenta de super admin (una sola vez)

En el servicio del backend, abrir una terminal (**⋯ → SSH**, o `railway ssh` desde el computador) y correr:

```sh
node dist/src/scripts/upsert-purchasable-plans.js
node dist/src/scripts/create-superadmin.js --email=TU_CORREO --name="Julieth Perdomo López"
```

El segundo pide la contraseña dos veces sin mostrarla. Si la terminal no deja escribirla, se puede pasar
`--password=...`, pero hay que cambiarla apenas se entre (queda en el historial).

## 6. Comprobar la IP real (límites de intentos)

Los límites de intentos (entrar, inscribirse, PIN del equipo) van por la IP del visitante. Con este montaje
`TRUST_PROXY=1` es lo correcto **si el borde de Railway pone la IP real al final de `X-Forwarded-For`**; en su foro
hay respuestas que no coinciden, así que se comprueba con la dirección del panel (`PANEL`):

```sh
# 7 intentos seguidos con una IP inventada adelante: el 7.º debe dar 429 (frenado).
for i in 1 2 3 4 5 6 7; do curl -s -o /dev/null -w "%{http_code} " -H "X-Forwarded-For: 9.9.9.$i" \
  -H "Content-Type: application/json" -d '{"email":"nadie@x.test","password":"malamala1"}' $PANEL/api/auth/login; done
```

- `401 401 401 401 401 401 429`: bien. Cambiar la IP inventada no engaña al límite.
- Siete `401`: el límite se está engañando. **No subir `TRUST_PROXY`**; revisar los registros del backend y
  escribirme antes de abrir a los restaurantes.

Después de la prueba, esperar 3 minutos para que se libere el límite de tu propia IP.

## 7. Correos sin dominio propio

Sin dominio, Resend solo envía al correo de la cuenta de Resend: los códigos de inscripción y "Olvidé mi contraseña"
no les llegan a los restaurantes. Mientras tanto:

- `SIGNUP_MODE=review`: el negocio se inscribe, pero no entra hasta que el super admin pulsa "Aprobar".
- O crear cada restaurante de prueba desde el super admin (**Empresas → Nueva empresa**), que no necesita correo.

Antes de la Fase 7 (WhatsApp) y la 8 (pagos por correo) hay que comprar el dominio.

## 8. Wompi (cuando haya llaves)

- URL de eventos en el panel de Wompi: `https://PANEL/api/payments/webhook/wompi`.
- Las llaves de prueba de Wompi sirven para probar sin cobrar de verdad.

## Antes de cada despliegue

- `backend`: `npx tsc --noEmit -p tsconfig.json`, `npx jest`, `npm audit --omit=dev` (0).
- `frontend`: `npx tsc --noEmit -p .`, `npx eslint app components lib proxy.ts`, `pnpm audit --prod` (0).
- Con el servidor local: `npx ts-node src/scripts/check-isolation.ts` (aislamiento entre negocios).

## Probar las imágenes en local (sin Railway)

```sh
docker build -t destello-backend:prueba backend
docker build -t destello-frontend:prueba frontend
# Backend contra una base vacía en el Postgres local (red destello_default), con las mismas variables de arriba,
# y el panel con BACKEND_URL=http://<contenedor del backend>:3101. Así se probó el 2026-10-21.
```
