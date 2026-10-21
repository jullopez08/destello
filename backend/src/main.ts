import './timezone';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // rawBody: true so WhatsappWebhookSignatureGuard can verify Meta's
  // X-Hub-Signature-256 against the exact bytes Meta signed (request.rawBody)
  // — normal parsed req.body is unaffected, this only adds the raw buffer.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Cuántos proxies hay delante, para que req.ip sea el cliente real (los límites de intentos van por IP).
  // Montaje de Destello en Railway (Fase 4): navegador → borde de Railway → panel (proxy.ts, que reenvía
  // X-Forwarded-For tal cual) → este backend por la red privada. Un salto que agrega su entrada: TRUST_PROXY=1.
  // Si el backend se llamara por su dirección pública habría dos (TRUST_PROXY=2). Un número mayor que los saltos
  // reales deja que un cliente escriba su propia IP en X-Forwarded-For: se comprueba al desplegar (DEPLOY.md).
  // Local (sin proxy delante del panel) da igual: no llega X-Forwarded-For.
  app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

  // First middleware registered, so these headers land on every response —
  // including ones a later guard/filter rejects early. This backend is a
  // JSON API (plus the WhatsApp media byte-stream and one plain-text "/"):
  // it never serves an HTML page that itself loads a script, stylesheet,
  // font, or image from anywhere, self included — so the directives below
  // are deliberately tighter than helmet's own defaults (which allow
  // 'unsafe-inline' for styles and https:/data: for fonts/images) rather
  // than looser: there's nothing real to allow beyond 'self', and nothing
  // here ever needs 'unsafe-inline'. frame-ancestors 'none' mirrors
  // X-Frame-Options: DENY below — both must agree, since a modern browser
  // prefers CSP's frame-ancestors over X-Frame-Options when both are present.
  app.use(
    helmet({
      strictTransportSecurity: {
        maxAge: 31536000, // 1 year, the conventional HSTS value
        includeSubDomains: true,
      },
      xFrameOptions: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          imgSrc: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );

  const configService = app.get(ConfigService);
  // Same FRONTEND_URL already used to build WhatsApp booking/reschedule
  // links (see password-reset.service.ts, whatsapp-button-action.service.ts,
  // whatsapp-welcome-button-action.service.ts) — one variable for "where the
  // frontend lives" instead of a second one that could drift out of sync
  // with it. Comma-separated so a local ngrok tunnel (needed to let Meta
  // reach the WhatsApp webhook during testing) can be added alongside
  // localhost without touching code, e.g.
  // FRONTEND_URL=http://localhost:3000,https://abc123.ngrok-free.app —
  // a single value works exactly as before.
  //
  // Local dev (.env): FRONTEND_URL=http://localhost:3000 (already set).
  // Production (Railway): set FRONTEND_URL=https://aggendarme.com — no
  // localhost, no ngrok, just the real domain.
  const allowedOrigins = (configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3100')
    .split(',')
    // Same trailing-slash normalization already applied to this same
    // FRONTEND_URL value in password-reset.service.ts and
    // whatsapp-webhook.util.ts — the Origin header a browser sends never
    // has a trailing slash, so a stray one here (easy to add by copying a
    // URL from the address bar) would otherwise silently fail to match and
    // CORS would reject the request with no visible error.
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  })

  app.use(cookieParser());

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  // HOST: 0.0.0.0 en local; en Railway '::', porque su red privada (por donde llega el panel) pide escuchar en IPv6
  // y Node con '::' también recibe IPv4. Explícito porque sin host Node solo escucha '::' y depende del sistema.
  await app.listen(process.env.PORT ?? 3101, process.env.HOST ?? '0.0.0.0');
}
bootstrap();
