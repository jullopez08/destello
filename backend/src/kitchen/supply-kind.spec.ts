import { BadRequestException } from '@nestjs/common';
import { assertPackagingByUnit } from './inventory.service';

describe('un empaque va por unidad', () => {
  it('acepta un empaque por unidad y un ingrediente por peso, volumen o unidad (huevos)', () => {
    expect(() => assertPackagingByUnit({ category: 'PACKAGING', kind: 'UNIT' })).not.toThrow();
    expect(() => assertPackagingByUnit({ category: 'INGREDIENT', kind: 'MASS' })).not.toThrow();
    expect(() => assertPackagingByUnit({ category: 'INGREDIENT', kind: 'VOLUME' })).not.toThrow();
    expect(() => assertPackagingByUnit({ category: 'INGREDIENT', kind: 'UNIT' })).not.toThrow();
  });

  it('rechaza un empaque por peso o volumen', () => {
    expect(() => assertPackagingByUnit({ category: 'PACKAGING', kind: 'MASS' })).toThrow(BadRequestException);
    expect(() => assertPackagingByUnit({ category: 'PACKAGING', kind: 'VOLUME' })).toThrow(BadRequestException);
  });
});
