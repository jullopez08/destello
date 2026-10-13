import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export const WOMPI_CURRENCY = 'COP';

export interface WompiWebhookPayload {
  event: string;
  data: Record<string, any>;
  sent_at?: string;
  timestamp: number;
  signature: {
    checksum: string;
    properties: string[];
  };
  environment?: string;
}

// The subset of Wompi's transaction object this app reads — same shape in
// webhook events (data.transaction) and in GET /transactions/{id} (data).
export interface WompiTransaction {
  id: string;
  status: string;
  reference: string;
  amount_in_cents: number;
  currency: string;
}

// Wompi's sandbox and production APIs are separate hosts, and each key only
// works against its own environment — so the environment is read off the
// key prefix (prv_test_ / prv_prod_) instead of needing a separate env var
// that could drift out of sync with the keys themselves.
// https://docs.wompi.co/en/docs/colombia/ambientes-y-llaves/
const SANDBOX_BASE_URL = 'https://sandbox.wompi.co/v1';
const PRODUCTION_BASE_URL = 'https://production.wompi.co/v1';

// Every key is read with config.get (never getOrThrow): the previous
// integration threw in this constructor when the variables were missing,
// which took down the whole backend on startup in production (see commit
// 8c3dabd). Missing keys now only disable the payment endpoints — callers
// check isConfigured() first.
@Injectable()
export class WompiService {
  private readonly logger = new Logger(WompiService.name);
  private readonly privateKey?: string;
  private readonly integritySecret?: string;
  private readonly eventsSecret?: string;
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.privateKey = config.get<string>('WOMPI_PRIVATE_KEY') || undefined;
    this.integritySecret =
      config.get<string>('WOMPI_INTEGRITY_SECRET') || undefined;
    this.eventsSecret = config.get<string>('WOMPI_EVENTS_SECRET') || undefined;
    this.baseUrl = this.privateKey?.startsWith('prv_prod_')
      ? PRODUCTION_BASE_URL
      : SANDBOX_BASE_URL;

    // Names only, never values — enough to tell from the startup log
    // whether payments will work and against which environment.
    const missing = [
      ['WOMPI_PRIVATE_KEY', this.privateKey],
      ['WOMPI_INTEGRITY_SECRET', this.integritySecret],
      ['WOMPI_EVENTS_SECRET', this.eventsSecret],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length === 0) {
      this.logger.log(
        `Wompi configured (${this.baseUrl === PRODUCTION_BASE_URL ? 'production' : 'sandbox'}).`,
      );
    } else {
      this.logger.warn(
        `Wompi disabled — missing ${missing.join(', ')}. /payments endpoints will answer 503.`,
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(
      this.privateKey && this.integritySecret && this.eventsSecret,
    );
  }

  /**
   * SHA-256(reference + amountInCents + currency + integritySecret), hex digest.
   * A plain hash over the concatenation, NOT an HMAC — that's Wompi's
   * documented algorithm, and an HMAC signature would simply be rejected.
   * https://docs.wompi.co/en/docs/colombia/widget-checkout-web/
   */
  generateIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string = WOMPI_CURRENCY,
  ): string {
    const raw = `${reference}${amountInCents}${currency}${this.integritySecret ?? ''}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Validates a webhook event's checksum per Wompi's documented algorithm:
   * concatenate the values of `signature.properties` (dot-paths resolved
   * against `data`, in the order given), append `timestamp`, append the
   * Events secret, then SHA-256 hex the result and compare against
   * `signature.checksum`. https://docs.wompi.co/en/docs/colombia/eventos/
   *
   * `signature.properties` is dynamic per event — never hardcode which
   * fields it contains, always read it from the payload itself.
   */
  verifyEventSignature(payload: WompiWebhookPayload): boolean {
    if (!this.eventsSecret) return false;

    const { data, timestamp, signature } =
      payload ?? ({} as WompiWebhookPayload);
    if (!data || !signature?.checksum || !Array.isArray(signature.properties))
      return false;

    const concatenatedProperties = signature.properties
      .map((path) => this.resolveDotPath(data, path))
      .join('');

    const raw = `${concatenatedProperties}${timestamp}${this.eventsSecret}`;
    const computed = crypto.createHash('sha256').update(raw).digest('hex');
    const received = String(signature.checksum).toLowerCase();

    // Constant-time compare; timingSafeEqual throws on length mismatch, so
    // that case is rejected up front.
    return (
      computed.length === received.length &&
      crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(received))
    );
  }

  // https://docs.wompi.co/en/docs/colombia/transacciones/ — the source of
  // truth for a transaction's status, independent of whatever query params
  // the browser arrived with.
  async getTransaction(transactionId: string): Promise<WompiTransaction> {
    const response = await firstValueFrom(
      this.http.get<{ data: WompiTransaction }>(
        `${this.baseUrl}/transactions/${encodeURIComponent(transactionId)}`,
        {
          headers: { Authorization: `Bearer ${this.privateKey}` },
        },
      ),
    );

    return response.data.data;
  }

  private resolveDotPath(source: Record<string, any>, path: string): string {
    const value = path
      .split('.')
      .reduce<unknown>(
        (acc, key) => (acc as Record<string, unknown> | undefined)?.[key],
        source,
      );
    if (value === undefined || value === null) return '';
    // Signed properties are always scalars (ids, statuses, amounts) per
    // Wompi's docs — an object here means a bad path, and it must not
    // silently hash as "[object Object]".
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    return JSON.stringify(value);
  }
}
