// Script manual (no corre solo). Crea o deja al día los planes de la lista de
// precios: la prueba gratuita y el plan mensual. El super admin los asigna al
// crear cada empresa; la empresa nunca elige plan: paga el que tiene asignado
// (PaymentsService.createCheckout). Al vencer la prueba, el cron le asigna el
// plan mensual (SubscriptionBillingCron, que lo busca por este mismo nombre).
// Idempotente: se busca por Plan.name (único). No toca otros planes ni
// suscripciones.
//
//   npx ts-node src/scripts/upsert-purchasable-plans.ts

import { PrismaClient } from '@prisma/client';
import { TRIAL_FOLLOW_UP_PLAN_NAME } from '../subscriptions/subscription-billing.cron';

const COP = 100; // Plan.price va en centavos COP

// PRECIO POR CONFIRMAR con Julieth: el super admin también lo puede cambiar en Panel → Planes.
const PRICE_LIST = [
  { name: 'Prueba Gratuita', price: 0, durationDays: 15, isTrial: true },
  { name: TRIAL_FOLLOW_UP_PLAN_NAME, price: 79_000 * COP, durationDays: 30, isTrial: false },
];

const prisma = new PrismaClient();

async function main() {
  for (const plan of PRICE_LIST) {
    const data = { price: plan.price, durationDays: plan.durationDays, isTrial: plan.isTrial, active: true };

    const saved = await prisma.plan.upsert({
      where: { name: plan.name },
      create: { name: plan.name, ...data },
      update: data,
    });

    console.log(`${saved.name}: $${(saved.price / 100).toLocaleString('es-CO')} COP / ${saved.durationDays} días`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
