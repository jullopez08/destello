// El tipo que manda el navegador (mimetype) lo escribe quien sube el archivo:
// se revisan los primeros bytes. Solo PNG, JPG y WebP; SVG no, porque puede
// llevar código.
export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function isAllowedImage(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const webp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return png || jpeg || webp;
}

/** El tipo real de la imagen por sus primeros bytes (nunca el que dice el navegador), o null si no es PNG, JPG ni WebP. */
export function imageMime(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (!isAllowedImage(buffer)) return null;
  if (buffer[0] === 0x89) return 'image/png';
  if (buffer[0] === 0xff) return 'image/jpeg';
  return 'image/webp';
}
