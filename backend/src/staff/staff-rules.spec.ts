import { afterWrongPin, isLocked, isWeakPin, MAX_PIN_FAILS, newPin, newSecret, parseDeviceCookie, PIN_LOCK_MS, sameHash, sha256 } from './staff-rules';

describe('reglas del equipo del restaurante', () => {
  const now = new Date('2026-10-19T20:00:00Z');

  it('a los 5 PIN equivocados el aparato queda bloqueado 15 minutos y la cuenta vuelve a 0', () => {
    let fails = 0;
    let lock: Date | null = null;
    for (let i = 1; i < MAX_PIN_FAILS; i++) {
      ({ failedPins: fails, lockedUntil: lock } = afterWrongPin(fails, now));
      expect(lock).toBeNull();
    }
    ({ failedPins: fails, lockedUntil: lock } = afterWrongPin(fails, now));
    expect(fails).toBe(0);
    expect(lock!.getTime() - now.getTime()).toBe(PIN_LOCK_MS);
    expect(isLocked(lock, now)).toBe(true);
    expect(isLocked(lock, new Date(now.getTime() + PIN_LOCK_MS + 1))).toBe(false);
  });

  it('la cookie del aparato es "id.secreto" y se rechaza cualquier otra forma', () => {
    expect(parseDeviceCookie('abc.def')).toEqual({ id: 'abc', secret: 'def' });
    expect(parseDeviceCookie(undefined)).toBeNull();
    expect(parseDeviceCookie('sinpunto')).toBeNull();
    expect(parseDeviceCookie('.secreto')).toBeNull();
    expect(parseDeviceCookie('id.')).toBeNull();
  });

  it('los secretos son largos, distintos y se comparan por su huella', () => {
    const a = newSecret(), b = newSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(sameHash(a, sha256(a))).toBe(true);
    expect(sameHash(b, sha256(a))).toBe(false);
  });

  it('el PIN lo genera Destello: 4 números y nunca uno fácil de adivinar', () => {
    for (const weak of ['0000', '1111', '1234', '4321', '6789', '9876']) expect(isWeakPin(weak)).toBe(true);
    for (const ok of ['4821', '1235', '9071']) expect(isWeakPin(ok)).toBe(false);
    for (let i = 0; i < 200; i++) {
      const pin = newPin();
      expect(pin).toMatch(/^\d{4}$/);
      expect(isWeakPin(pin)).toBe(false);
    }
  });
});
