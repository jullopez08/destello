import { Prisma } from '@prisma/client';

// Borra TODO lo de una organización, dentro de la transacción que le pasen. El
// orden importa: ninguna relación hacia Organization o User tiene borrado en
// cascada, así que cada tabla se vacía antes que aquella a la que apunta.
//
// No se guarda nada, ni siquiera los pagos: los soportes contables son las
// transacciones de Wompi y las facturas, no esta base.
//
// Al agregar modelos de la cocina con organizationId, bórralos aquí ANTES de
// user y organization (y antes que los modelos a los que apuntan).
export async function purgeOrganizationData(
  tx: Prisma.TransactionClient,
  organizationId: string,
) {
  // ── Cocina: de lo que más depende a lo que menos ──
  await tx.productionCheck.deleteMany({ where: { organizationId } });
  await tx.orderLine.deleteMany({ where: { order: { organizationId } } });
  await tx.order.deleteMany({ where: { organizationId } });
  await tx.editionPresentation.deleteMany({ where: { edition: { organizationId } } });
  await tx.edition.deleteMany({ where: { organizationId } });
  await tx.presentationItem.deleteMany({ where: { presentation: { organizationId } } });
  await tx.presentationPack.deleteMany({ where: { presentation: { organizationId } } });
  await tx.presentationSize.deleteMany({ where: { presentation: { organizationId } } });
  await tx.presentation.deleteMany({ where: { organizationId } });
  await tx.productExtra.deleteMany({ where: { product: { organizationId } } });
  await tx.product.deleteMany({ where: { organizationId } });
  await tx.doughLot.deleteMany({ where: { organizationId } });
  await tx.doughWaste.deleteMany({ where: { organizationId } });
  await tx.recipeItem.deleteMany({ where: { recipe: { organizationId } } });
  await tx.recipe.deleteMany({ where: { organizationId } });
  await tx.purchaseLine.deleteMany({ where: { purchase: { organizationId } } });
  await tx.purchase.deleteMany({ where: { organizationId } });
  await tx.supply.deleteMany({ where: { organizationId } });
  await tx.supplier.deleteMany({ where: { organizationId } });
  await tx.courier.deleteMany({ where: { organizationId } });
  await tx.bankAccount.deleteMany({ where: { organizationId } });

  await tx.payment.deleteMany({ where: { subscription: { organizationId } } });
  await tx.subscription.deleteMany({ where: { organizationId } });

  await tx.user.deleteMany({ where: { organizationId } });

  return tx.organization.delete({ where: { id: organizationId } });
}
