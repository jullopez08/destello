import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Captcha invisible de la inscripción (Cloudflare Turnstile, gratis; Julieth, 2026-10-20). La mayoría de las
// personas no ven nada; solo si Cloudflare duda sale una casilla. Sin TURNSTILE_SECRET_KEY no se revisa (como
// Resend sin llave), así que se enciende poniendo las dos llaves: esta y NEXT_PUBLIC_TURNSTILE_SITE_KEY del panel.
@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly secret: string | undefined;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('TURNSTILE_SECRET_KEY') || undefined;
    if (!this.secret) this.logger.warn('TURNSTILE_SECRET_KEY is not set: signup captcha is off.');
  }

  async check(token: string | undefined, ip: string | undefined) {
    if (!this.secret) return;
    const fail = new BadRequestException('No pudimos comprobar que eres una persona. Vuelve a intentarlo.');
    if (!token) throw fail;
    const body = new URLSearchParams({ secret: this.secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    try {
      const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(8000) });
      const result = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
      if (result.success) return;
      this.logger.warn(`Captcha rejected: ${(result['error-codes'] ?? []).join(',')}`);
    } catch (err) {
      this.logger.error(`Captcha check failed: ${(err as Error).message}`);
    }
    throw fail;
  }
}
