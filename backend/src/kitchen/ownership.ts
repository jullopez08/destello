import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Comprobaciones de que lo que llega pertenece a la empresa de la sesión
// (aislamiento entre negocios). Las usan InventoryService y RecipeBookService.

type Tx = Prisma.TransactionClient;

export async function assertSupplier(db: PrismaService | Tx, organizationId: string, supplierId: string) {
  await own(db.supplier.findUnique({ where: { id: supplierId } }), organizationId, 'Proveedor no encontrado.');
}

// Todos los insumos deben existir y ser de esta empresa.
export async function assertSupplies(db: PrismaService | Tx, organizationId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const supplies = await db.supply.findMany({ where: { organizationId, id: { in: unique } } });
  if (supplies.length !== unique.length) throw new BadRequestException('Algún insumo no existe.');
  return supplies;
}

export async function own<T extends { organizationId: string }>(query: Promise<T | null>, organizationId: string, message: string): Promise<T> {
  const record = await query;
  if (!record || record.organizationId !== organizationId) throw new NotFoundException(message);
  return record;
}
