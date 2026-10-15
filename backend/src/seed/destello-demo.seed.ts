// Datos de ejemplo para la BD LOCAL (no correr contra producción). Crea:
// - superadmin@destello.test (SUPER_ADMIN)
// - "Cocina Destello" con su dueña duena@destello.test: proveedores, insumos,
//   compras, recetas, lotes, productos, cajas, pedidos de hoy y de las últimas
//   8 semanas, y ediciones especiales (los mismos datos del diseño)
// - "Panadería La Espiga" (en prueba) con su dueña espiga@destello.test
// Contraseña de todas: test1234. Si ya hay usuarios, no hace nada.
//
//   npx ts-node src/seed/destello-demo.seed.ts

import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { addDays, toIsoDate } from '../kitchen/kitchen-rules';
import { seedOrdersAndEditions } from './destello-demo-orders.seed';

const prisma = new PrismaClient();
const PASSWORD = 'test1234';
const DAY = 24 * 60 * 60 * 1000;

async function main() {
  if (await prisma.user.findFirst()) {
    console.log('Ya hay usuarios en la base de datos: no se ejecutó el seed.');
    return;
  }

  const password = await bcrypt.hash(PASSWORD, 10);
  const today = toIsoDate(new Date());

  const trial = await prisma.plan.upsert({
    where: { name: 'Prueba Gratuita' },
    create: { name: 'Prueba Gratuita', price: 0, durationDays: 15, isTrial: true },
    update: {},
  });
  const monthly = await prisma.plan.upsert({
    where: { name: 'Plan Mensual' },
    create: { name: 'Plan Mensual', price: 79_000 * 100, durationDays: 30 },
    update: {},
  });

  await prisma.user.create({
    data: { email: 'superadmin@destello.test', name: 'Super Admin', password, roles: [Role.SUPER_ADMIN] },
  });

  // ── Cocina Destello: plan mensual ya pagado ──
  const org = await prisma.organization.create({
    data: {
      name: 'Cocina Destello',
      slug: 'cocina-destello',
      palette: 'vainilla',
      whatsapp: '300 555 1020',
      orderCutoff: '12:00',
      closedDays: [0],
      targetMargin: 50,
      nextOrderNumber: 1045,
    },
  });
  const organizationId = org.id;

  const owner = await prisma.user.create({
    data: {
      email: 'duena@destello.test',
      name: 'Administración',
      password,
      roles: [Role.ADMIN],
      organizationId,
      termsAcceptedAt: new Date(),
      termsVersion: '2026-10-11',
    },
  });

  const subscription = await prisma.subscription.create({
    data: {
      organizationId,
      planId: monthly.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + 20 * DAY),
      billingContactUserId: owner.id,
    },
  });
  await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      method: 'CASH',
      amount: monthly.price,
      status: 'APPROVED',
      note: 'Pago de ejemplo',
      periodStart: new Date(Date.now() - 10 * DAY),
      periodEnd: new Date(Date.now() + 20 * DAY),
    },
  });

  await prisma.bankAccount.createMany({
    data: [
      { organizationId, bank: 'Bancolombia', type: 'Ahorros', number: '123-456789-01', owner: 'Cocina Destello SAS' },
      { organizationId, bank: 'Nequi', type: 'Celular', number: '300 555 1020', owner: 'Cocina Destello' },
    ],
  });

  const couriers = await Promise.all(
    [
      ['Don Jairo', '311 402 8899'],
      ['Marcela Ruiz', '316 220 1144'],
      ['Esteban Gil', '320 908 3321'],
    ].map(([name, phone], position) => prisma.courier.create({ data: { organizationId, name, phone, position } })),
  );

  const sup = async (name: string, contact: string, phone: string, email: string, address: string, notes: string, color: string) =>
    prisma.supplier.create({ data: { organizationId, name, contact, phone, email, address, notes, color } });
  const molinos = await sup('Molinos del Valle', 'Andrea Rojas', '310 456 7788', 'pedidos@molinosdelvalle.co', 'Cra 15 # 45-20, Bogotá', 'Entrega martes y viernes. Pedido mínimo 25 kg.', 'banana');
  const lacteos = await sup('Lácteos La Pradera', 'Camilo Ortiz', '315 220 3344', 'camilo@lapradera.co', 'Calle 80 # 22-10', 'Mantequilla sin sal en bloque de 1 kg.', 'sky');
  const chocolates = await sup('Chocolates Andinos', 'Laura Méndez', '301 998 1122', 'laura@chocandinos.co', 'Av. 68 # 13-50', 'Chips de chocolate 54 %. Descuento por 5 kg.', 'peach');
  const empaques = await sup('Empaques Dulce Caja', 'Sofía Pardo', '320 777 6655', 'ventas@dulcecaja.co', 'Calle 13 # 68-90', 'Cajas kraft con ventana. Stickers personalizados en 5 días.', 'strawberry');
  const especias = await sup('Especias de Oriente', 'Julián Vargas', '318 333 4455', 'julian@especiasoriente.co', 'Plaza de Paloquemao, local 112', 'Canela de Ceilán molida.', 'lilac');

  type K = 'MASS' | 'VOLUME' | 'UNIT';
  const supplyRows: [string, string, K, 'INGREDIENT' | 'PACKAGING', number, number, number, string][] = [
    ['harina', 'Harina de trigo', 'MASS', 'INGREDIENT', 12000, 5000, 3.2, molinos.id],
    ['azucar', 'Azúcar blanca', 'MASS', 'INGREDIENT', 8000, 3000, 3.8, molinos.id],
    ['morena', 'Azúcar morena', 'MASS', 'INGREDIENT', 3000, 2000, 4.5, molinos.id],
    ['mantequilla', 'Mantequilla sin sal', 'MASS', 'INGREDIENT', 3400, 3000, 28, lacteos.id],
    ['huevos', 'Huevos', 'UNIT', 'INGREDIENT', 60, 30, 600, lacteos.id],
    ['leche', 'Leche entera', 'VOLUME', 'INGREDIENT', 4000, 2000, 4.2, lacteos.id],
    ['queso', 'Queso crema', 'MASS', 'INGREDIENT', 1500, 1000, 22, lacteos.id],
    ['chocolate', 'Chips de chocolate 54 %', 'MASS', 'INGREDIENT', 1800, 2000, 38, chocolates.id],
    ['cacao', 'Cacao en polvo', 'MASS', 'INGREDIENT', 900, 500, 30, chocolates.id],
    ['canela', 'Canela molida', 'MASS', 'INGREDIENT', 240, 300, 60, especias.id],
    ['vainilla', 'Esencia de vainilla', 'VOLUME', 'INGREDIENT', 400, 100, 25, especias.id],
    ['levadura', 'Levadura seca', 'MASS', 'INGREDIENT', 500, 200, 25, molinos.id],
    ['caja9', 'Caja kraft x9', 'UNIT', 'PACKAGING', 40, 20, 900, empaques.id],
    ['caja3', 'Caja rollos x3', 'UNIT', 'PACKAGING', 12, 15, 750, empaques.id],
    ['caja6', 'Caja rollos x6', 'UNIT', 'PACKAGING', 30, 15, 800, empaques.id],
    ['sticker', 'Sticker Destello', 'UNIT', 'PACKAGING', 300, 100, 60, empaques.id],
    ['capacillo', 'Capacillo', 'UNIT', 'PACKAGING', 500, 200, 12, empaques.id],
  ];
  const S: Record<string, string> = {};
  for (const [key, name, kind, category, stock, min, cost, supplierId] of supplyRows) {
    S[key] = (await prisma.supply.create({ data: { organizationId, name, kind, category, stock, min, cost, supplierId } })).id;
  }

  const purchase = (daysAgo: number, supplierId: string, lines: [string, number, number][]) =>
    prisma.purchase.create({
      data: {
        organizationId,
        supplierId,
        date: addDays(today, -daysAgo),
        lines: { create: lines.map(([k, qty, total]) => ({ supplyId: S[k], qty, total })) },
      },
    });
  await purchase(6, molinos.id, [['harina', 25000, 80000], ['azucar', 10000, 38000]]);
  await purchase(4, chocolates.id, [['chocolate', 3000, 114000]]);
  await purchase(2, lacteos.id, [['mantequilla', 5000, 140000], ['huevos', 60, 36000]]);

  const recipe = (name: string, yieldGrams: number, color: string, items: [string, number][]) =>
    prisma.recipe.create({
      data: { organizationId, name, yieldGrams, color, items: { create: items.map(([k, qty]) => ({ supplyId: S[k], qty })) } },
    });
  const chips = await recipe('Masa de galleta con chips', 2400, 'banana', [['harina', 1000], ['mantequilla', 500], ['morena', 400], ['chocolate', 400], ['huevos', 4], ['vainilla', 10]]);
  const doble = await recipe('Masa de doble chocolate', 2200, 'peach', [['harina', 900], ['mantequilla', 450], ['azucar', 400], ['cacao', 150], ['chocolate', 300], ['huevos', 4]]);
  const rollos = await recipe('Masa de rollos de canela', 1800, 'strawberry', [['harina', 1000], ['leche', 400], ['mantequilla', 200], ['azucar', 150], ['levadura', 20], ['huevos', 3], ['canela', 60]]);
  const brioche = await recipe('Masa de pan brioche', 1500, 'lilac', [['harina', 900], ['mantequilla', 250], ['leche', 250], ['huevos', 5], ['azucar', 100], ['levadura', 15]]);

  await prisma.doughLot.createMany({
    data: [
      { organizationId, recipeId: chips.id, grams: 2400, left: 1650, madeOn: addDays(today, -1), expiresOn: addDays(today, 3) },
      { organizationId, recipeId: doble.id, grams: 2200, left: 600, madeOn: addDays(today, -2), expiresOn: addDays(today, 1) },
    ],
  });

  const product = (name: string, mode: 'LOT' | 'ON_DEMAND', recipeId: string, grams: number, look: string, extras: [string, number][]) =>
    prisma.product.create({
      data: { organizationId, name, mode, recipeId, grams, look, extras: { create: extras.map(([k, qty]) => ({ supplyId: S[k], qty })) } },
    });
  const galleta = await product('Galleta con chips', 'LOT', chips.id, 20, '', [['capacillo', 1]]);
  const dobleP = await product('Galleta doble chocolate', 'LOT', doble.id, 20, 'choco', [['capacillo', 1]]);
  const rollo = await product('Rollo de canela', 'ON_DEMAND', rollos.id, 120, 'roll', [['queso', 25]]);
  const pan = await product('Pan brioche', 'ON_DEMAND', brioche.id, 400, 'bread', []);

  const P: Record<string, { id: string; price: number }> = {};
  const pres = async (key: string, name: string, price: number, items: [string, number][], pack: [string, number][]) => {
    const created = await prisma.presentation.create({
      data: {
        organizationId,
        name,
        price,
        items: { create: items.map(([productId, units]) => ({ productId, units })) },
        pack: { create: pack.map(([k, qty]) => ({ supplyId: S[k], qty })) },
      },
    });
    P[key] = { id: created.id, price };
  };
  await pres('x9chips', 'Caja x9 galletas con chips', 20000, [[galleta.id, 9]], [['caja9', 1], ['sticker', 1]]);
  await pres('x9doble', 'Caja x9 doble chocolate', 22000, [[dobleP.id, 9]], [['caja9', 1], ['sticker', 1]]);
  await pres('surtida', 'Caja surtida x9', 21000, [[galleta.id, 5], [dobleP.id, 4]], [['caja9', 1], ['sticker', 1]]);
  await pres('x3rollos', 'Caja x3 rollos de canela', 18000, [[rollo.id, 3]], [['caja3', 1], ['sticker', 1]]);
  await pres('x6rollos', 'Caja x6 rollos de canela', 34000, [[rollo.id, 6]], [['caja6', 1], ['sticker', 1]]);
  await pres('rollo1', 'Rollo de canela suelto', 3000, [[rollo.id, 1]], [['sticker', 1]]);
  await pres('brioche1', 'Pan brioche', 12000, [[pan.id, 1]], [['sticker', 1]]);
  await pres('brioche2x1', 'Promo 2x1 pan brioche', 7000, [[pan.id, 2]], [['sticker', 2]]);
  await pres('halloween', 'Caja Halloween x9', 25000, [[dobleP.id, 5], [galleta.id, 4]], [['caja9', 1], ['sticker', 1]]);
  await seedOrdersAndEditions(prisma, organizationId, today, P, couriers);


  // ── Panadería La Espiga: recién creada, en prueba ──
  const espiga = await prisma.organization.create({ data: { name: 'Panadería La Espiga', slug: 'panaderia-la-espiga', palette: 'fresa' } });
  const espigaOwner = await prisma.user.create({
    data: { email: 'espiga@destello.test', name: 'Marta Cárdenas', password, roles: [Role.ADMIN], organizationId: espiga.id },
  });
  await prisma.subscription.create({
    data: {
      organizationId: espiga.id,
      planId: trial.id,
      status: SubscriptionStatus.TRIALING,
      currentPeriodEnd: new Date(Date.now() + 15 * DAY),
      billingContactUserId: espigaOwner.id,
    },
  });

  console.log('Listo. Cuentas (contraseña test1234):');
  console.log('  superadmin@destello.test  → super admin');
  console.log('  duena@destello.test       → Cocina Destello');
  console.log('  espiga@destello.test      → Panadería La Espiga (en prueba, sin aceptar términos)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
