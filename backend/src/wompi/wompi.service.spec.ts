import * as crypto from 'crypto';
import { WompiService, type WompiWebhookPayload } from './wompi.service';

const sha256 = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

function makeService(env: Record<string, string | undefined>) {
  const config = { get: (key: string) => env[key] };
  return new WompiService({} as any, config as any);
}

const CONFIGURED_ENV = {
  WOMPI_PRIVATE_KEY: 'prv_test_abc',
  WOMPI_INTEGRITY_SECRET: 'test_integrity_xyz',
  WOMPI_EVENTS_SECRET: 'test_events_123',
};

describe('WompiService', () => {
  it('does not throw and reports not configured when the env vars are missing', () => {
    const service = makeService({});
    expect(service.isConfigured()).toBe(false);
  });

  it('signs reference + amount + currency + integrity secret with plain SHA-256', () => {
    const service = makeService(CONFIGURED_ENV);
    expect(service.generateIntegritySignature('sub_1_1000', 9000000)).toBe(
      sha256('sub_1_10009000000COPtest_integrity_xyz'),
    );
  });

  describe('verifyEventSignature', () => {
    const data = {
      transaction: { id: 'tx-1', status: 'APPROVED', amount_in_cents: 9000000 },
    };
    const properties = [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const timestamp = 1530291411;
    const validChecksum = sha256(
      `tx-1APPROVED9000000${timestamp}test_events_123`,
    );

    const payload = (checksum: string): WompiWebhookPayload => ({
      event: 'transaction.updated',
      data,
      timestamp,
      signature: { checksum, properties },
    });

    it('accepts a checksum computed with the events secret (case-insensitive)', () => {
      const service = makeService(CONFIGURED_ENV);
      expect(service.verifyEventSignature(payload(validChecksum))).toBe(true);
      expect(
        service.verifyEventSignature(payload(validChecksum.toUpperCase())),
      ).toBe(true);
    });

    it('rejects a tampered payload', () => {
      const service = makeService(CONFIGURED_ENV);
      const tampered = payload(validChecksum);
      tampered.data = {
        transaction: { ...data.transaction, amount_in_cents: 100 },
      };
      expect(service.verifyEventSignature(tampered)).toBe(false);
    });

    it('rejects everything when no events secret is configured', () => {
      const service = makeService({});
      expect(
        service.verifyEventSignature(
          payload(sha256(`tx-1APPROVED9000000${timestamp}`)),
        ),
      ).toBe(false);
    });

    it('rejects a malformed payload without throwing', () => {
      const service = makeService(CONFIGURED_ENV);
      expect(service.verifyEventSignature({} as WompiWebhookPayload)).toBe(
        false,
      );
      expect(service.verifyEventSignature(payload('short'))).toBe(false);
    });
  });
});
