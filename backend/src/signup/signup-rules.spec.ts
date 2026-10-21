import { codeMatches, findUsLink, hashCode, isPdf, newCode, phoneDisplay, phoneKey, signupMode } from './signup-rules';

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

  it('¿Dónde te encontramos?: Instagram como @usuario, usuario o enlace', () => {
    expect(findUsLink('@Cocina.Destello')).toBe('https://instagram.com/cocina.destello');
    expect(findUsLink('cocina_destello')).toBe('https://instagram.com/cocina_destello');
    expect(findUsLink('https://www.instagram.com/cocinadestello/?hl=es')).toBe('https://instagram.com/cocinadestello');
    expect(findUsLink('instagram.com/cocinadestello')).toBe('https://instagram.com/cocinadestello');
  });

  it('¿Dónde te encontramos?: enlaces de Google Maps', () => {
    expect(findUsLink('https://maps.app.goo.gl/AbC123xyz')).toBe('https://maps.app.goo.gl/AbC123xyz');
    expect(findUsLink('https://www.google.com/maps/place/Cocina+Destello/@4.6,-74.1')).toMatch(/^https:\/\/www\.google\.com\/maps\/place/);
  });

  it('¿Dónde te encontramos?: rechaza otras páginas y textos sueltos', () => {
    expect(findUsLink('https://www.google.com/search?q=pasteleria')).toBeNull();
    expect(findUsLink('https://facebook.com/cocina')).toBeNull();
    expect(findUsLink('mi negocio en el barrio')).toBeNull();
    expect(findUsLink('@..')).toBeNull();
  });

  it('la carta solo se acepta si es un PDF de verdad', () => {
    expect(isPdf(Buffer.from('%PDF-1.7 ...'))).toBe(true);
    expect(isPdf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe(false);
  });
});
