import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { linePrice } from './kitchen-rules';
import { OrderLineDto } from './dto/kitchen.dto';

type Presentation = Prisma.PresentationGetPayload<{ include: { items: true; sizes: true } }>;

// Arma las líneas de un pedido según cómo se vende cada cosa y guarda el
// precio de ese momento:
// - Caja armada: solo la caja y cuántas.
// - Por unidad: el sabor (de los permitidos) y, si se pidió, otro empaque.
// - Sabor y tamaño: el sabor y el tamaño; precio = tamaño + recargo del sabor.
// `packagingIds` son los empaques de la empresa (para no aceptar uno ajeno).
export function buildOrderLines(lines: OrderLineDto[], presentations: Presentation[], packagingIds: Set<string>) {
  return lines.map((l) => {
    const p = presentations.find((x) => x.id === l.presentationId);
    if (!p) throw new BadRequestException('Algún producto no existe.');

    const line = { presentationId: p.id, qty: l.qty, productId: null as string | null, sizeId: null as string | null, packSupplyId: null as string | null };
    if (p.kind !== 'BOX') {
      if (!l.productId || !p.items.some((i) => i.productId === l.productId)) {
        throw new BadRequestException(`Elige el sabor de "${p.name}".`);
      }
      line.productId = l.productId;
    }
    if (p.kind === 'SIZES') {
      if (!l.sizeId || !p.sizes.some((s) => s.id === l.sizeId)) throw new BadRequestException(`Elige el tamaño de "${p.name}".`);
      line.sizeId = l.sizeId;
    }
    if (p.kind === 'UNIT' && l.packSupplyId) {
      if (!packagingIds.has(l.packSupplyId)) throw new BadRequestException('Ese empaque no existe.');
      line.packSupplyId = l.packSupplyId;
    }
    return { ...line, unitPrice: linePrice(p, line) };
  });
}
