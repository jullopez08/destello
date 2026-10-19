import { isAllowedImage } from './image-signature';

const pad = (bytes: number[]) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(16)]);

describe('isAllowedImage', () => {
  it('acepta PNG, JPG y WebP por sus primeros bytes', () => {
    expect(isAllowedImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(isAllowedImage(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
    expect(isAllowedImage(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'ascii'))).toBe(true);
  });

  it('rechaza SVG y archivos que solo dicen ser imagen', () => {
    expect(isAllowedImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>'))).toBe(false);
    expect(isAllowedImage(Buffer.from('MZ ejecutable disfrazado de png'))).toBe(false);
    expect(isAllowedImage(Buffer.alloc(4))).toBe(false);
  });
});
