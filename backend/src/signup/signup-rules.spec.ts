import { codeMatches, hashCode, newCode, phoneDisplay, phoneKey, signupMode } from './signup-rules';

describe('reglas de la inscripción', () => {
  it('SIGNUP_MODE: open por defecto, review y closed solo si se escriben así', () => {
    expect(signupMode(undefined)).toBe('open');
    expect(signupMode('review')).toBe('review');
    expect(signupMode('closed')).toBe('closed');
    expect(signupMode('cualquier cosa')).toBe('open');
  });

  it('el código tiene 6 números y se compara por su huella', () => {
    const code = newCode();
    expect(code).toMatch(/^\d{6}$/);
    expect(codeMatches(code, hashCode(code))).toBe(true);
    expect(codeMatches(` ${code} `, hashCode(code))).toBe(true);
    expect(codeMatches('000000', hashCode('123456'))).toBe(false);
  });

  it('el mismo WhatsApp escrito distinto cuenta como uno solo', () => {
    expect(phoneKey('+57 300 123 4567')).toBe('3001234567');
    expect(phoneKey('(300) 123-4567')).toBe('3001234567');
    expect(phoneDisplay('3001234567')).toBe('300 123 4567');
  });
});
