// Prueba de aislamiento entre negocios (Fase 2), contra el servidor encendido.
// SOLO EN LOCAL, con los datos del seed: si algo falla, La Espiga sí alcanza a
// cambiar datos de Cocina Destello.
//
// Uso (backend encendido en 3101):
//   npx ts-node src/scripts/check-isolation.ts [--api=http://localhost:3101]
//
// La Espiga intenta ver, cambiar, borrar o usar en lo suyo cada cosa de Cocina
// Destello. Todo debe rechazarse (403/404, o 400 por "no existe"), y al final
// el estado de Destello debe seguir idéntico. Si La Espiga no ha aceptado los
// términos, los acepta (como en su primer ingreso) para que la prueba no pase
// solo porque todo le responde 403.
import { readFileSync } from 'fs';
import { join } from 'path';

const API = process.argv.find((a) => a.startsWith('--api='))?.slice(6) ?? 'http://localhost:3101';
const PASSWORD = 'test1234';

type Res = { status: number; body: any };

async function login(email: string, password = PASSWORD) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`No pude entrar como ${email} (${res.status}).`);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('access_token='));
  return cookie!.split(';')[0];
}

async function call(cookie: string, method: string, path: string, body?: unknown): Promise<Res> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

function termsVersion() {
  const session = readFileSync(join(__dirname, '../../../frontend/lib/session.tsx'), 'utf8');
  return session.match(/CURRENT_TERMS_VERSION\s*=\s*["'](\d{4}-\d{2}-\d{2})["']/)![1];
}

// Lo que debe rechazarse. Cada intento lleva un cuerpo válido, para que el
// rechazo sea por pertenecer a otro negocio y no por un dato mal escrito.
function attempts(d: any, today: string) {
  const [account] = d.accounts, [courier] = d.couriers, [supplier] = d.suppliers, [supply] = d.supplies;
  const [recipe] = d.recipes, [product] = d.products, [presentation] = d.presentations;
  const lot = d.lots[0], batch = d.supplyBatches[0], edition = d.editions[0];
  const order = d.orders.find((o: any) => !['DELIVERED', 'CANCELLED'].includes(o.status));
  const list: [string, string, string, unknown?][] = [
    ['Borrar una cuenta', 'DELETE', `/kitchen/accounts/${account?.id}`],
    ['Mover un repartidor', 'POST', `/kitchen/couriers/${courier?.id}/move`, { direction: 'down' }],
    ['Borrar un repartidor', 'DELETE', `/kitchen/couriers/${courier?.id}`],
    ['Editar un proveedor', 'PUT', `/kitchen/suppliers/${supplier.id}`, { name: 'x', color: supplier.color, supplyIds: [] }],
    ['Borrar un proveedor', 'DELETE', `/kitchen/suppliers/${supplier.id}`],
    ['Editar un insumo', 'PUT', `/kitchen/supplies/${supply.id}`,
      { name: 'x', kind: supply.kind, category: supply.category, stock: 0, min: 0, cost: 1 }],
    ['Borrar un insumo', 'DELETE', `/kitchen/supplies/${supply.id}`],
    ['Marcar vencimiento de un insumo', 'PATCH', '/kitchen/supplies/perishable', { items: [{ supplyId: supply.id, perishable: false }] }],
    ['Comprar un insumo ajeno', 'POST', '/kitchen/purchases',
      { supplierId: supplier.id, date: today, lines: [{ supplyId: supply.id, qty: 1, total: 1 }] }],
    ['Editar una receta', 'PUT', `/kitchen/recipes/${recipe.id}`, { name: 'x', yieldGrams: 100, color: recipe.color, items: recipe.items }],
    ['Receta con insumo ajeno', 'POST', '/kitchen/recipes', { name: 'x', yieldGrams: 100, color: recipe.color, items: recipe.items }],
    ['Hacer lote con receta ajena', 'POST', '/kitchen/lots', { recipeId: recipe.id, batches: 1, days: 3 }],
    ['Editar un producto', 'PUT', `/kitchen/products/${product.id}`,
      { name: 'x', mode: product.mode, recipeId: product.recipeId, grams: product.grams, look: product.look }],
    ['Producto con receta ajena', 'POST', '/kitchen/products',
      { name: 'x', mode: product.mode, recipeId: product.recipeId, grams: product.grams, look: product.look }],
    ['Editar lo que se vende', 'PUT', `/kitchen/presentations/${presentation.id}`,
      { name: 'x', kind: presentation.kind, price: presentation.price, active: true, items: presentation.items,
        pack: presentation.pack, sizes: presentation.sizes }],
    ['Vender un producto ajeno', 'POST', '/kitchen/presentations',
      { name: 'x', kind: 'BOX', price: 1000, active: true, items: [{ productId: product.id, units: 1 }], pack: [] }],
    ['Pedido de algo ajeno', 'POST', '/kitchen/orders',
      { customer: 'x', delivery: 'PICKUP', payment: 'CASH', fee: 0, lines: [{ presentationId: presentation.id, qty: 1 }] }],
    ['Edición con algo ajeno', 'POST', '/kitchen/editions',
      { name: 'x', startDate: today, endDate: today, color: recipe.color, look: product.look, presentationIds: [presentation.id] }],
  ];
  if (lot) list.push(['Botar masa ajena', 'POST', `/kitchen/lots/${lot.id}/discard`]);
  if (batch) list.push(['Botar un insumo ajeno', 'POST', `/kitchen/supply-batches/${batch.id}/discard`]);
  if (edition) list.push(['Borrar una edición', 'DELETE', `/kitchen/editions/${edition.id}`]);
  if (order) {
    list.push(['Enviar un pedido ajeno', 'POST', `/kitchen/orders/${order.id}/send`, { courierId: courier.id }]);
    list.push(['Entregar un pedido ajeno', 'POST', `/kitchen/orders/${order.id}/deliver`]);
    list.push(['Editar un pedido ajeno', 'PUT', `/kitchen/orders/${order.id}`,
      { customer: 'x', delivery: 'PICKUP', payment: 'CASH', fee: 0, lines: order.lines.map((l: any) => ({ presentationId: l.presentationId, qty: 1 })) }]);
    list.push(['Marcar entregado un pedido ajeno atrasado', 'POST', `/kitchen/orders/${order.id}/delivered-late`]);
    list.push(['Marcar pagado un pedido ajeno', 'POST', `/kitchen/orders/${order.id}/paid`]);
    list.push(['Cancelar un pedido ajeno', 'POST', `/kitchen/orders/${order.id}/cancel`]);
  }
  return list;
}

// 2xx = fuga. 400 con lista de mensajes = la validación lo paró antes: no prueba nada.
function verdict({ status, body }: Res) {
  if (status < 300) return 'FUGA';
  if (status === 400 && Array.isArray(body?.message)) return 'NO CONCLUYE';
  return 'ok';
}

async function main() {
  const destello = await login('duena@destello.test');
  const espiga = await login('espiga@destello.test');

  let own = await call(espiga, 'GET', '/kitchen');
  if (own.status === 403 && own.body?.error === 'terms_not_accepted') {
    await call(espiga, 'POST', '/auth/accept-terms', { terms_version: termsVersion() });
    own = await call(espiga, 'GET', '/kitchen');
  }
  if (own.status !== 200) throw new Error(`La Espiga no puede ver su propia cocina (${own.status}): la prueba no serviría.`);

  const before = (await call(destello, 'GET', '/kitchen')).body;
  const me = (await call(destello, 'GET', '/auth/me')).body;
  const ownerId = me.user?.id ?? me.id ?? me.userId;
  const orgId = me.user?.organizationId ?? me.organizationId;

  const list = attempts(before, before.today);
  list.push(['Ver la cuenta de la dueña de Destello', 'GET', `/users/${ownerId}`]);
  list.push(['Ver la empresa Destello', 'GET', `/organizations/${orgId}`]);
  list.push(['Ver la suscripción de Destello', 'GET', `/subscriptions/${orgId}`]);
  list.push(['Aprobar un negocio (solo super admin)', 'POST', `/organizations/${orgId}/approve`]);
  list.push(['Marcar un negocio como no real (solo super admin)', 'POST', `/organizations/${orgId}/reject`]);
  list.push(['Bajar la carta en PDF de Destello (solo super admin)', 'GET', `/organizations/${orgId}/menu`]);

  // Equipo de otro restaurante (Repostería Lucía, si ya tiene meseros o cocina).
  const lucia = await login('lucia@prueba.test', 'clave1234').catch(() => null);
  const staff = lucia ? (await call(lucia, 'GET', '/kitchen/staff')).body : [];
  for (const m of Array.isArray(staff) ? staff.slice(0, 1) : []) {
    list.push([`Nuevo PIN para ${m.name} (otro restaurante)`, 'POST', `/kitchen/staff/${m.id}/pin`]);
    list.push([`Enlace nuevo para ${m.name} (otro restaurante)`, 'POST', `/kitchen/staff/${m.id}/link`]);
    if (m.devices[0]) list.push([`Desconectar el aparato de ${m.name}`, 'DELETE', `/kitchen/staff/${m.id}/devices/${m.devices[0].id}`]);
    list.push([`Hacer encargado de caja a ${m.name} (otro restaurante)`, 'PATCH', `/kitchen/staff/${m.id}/cashier`, { cashier: true }]);
    list.push([`Quitar a ${m.name} (otro restaurante)`, 'DELETE', `/kitchen/staff/${m.id}`]);
  }
  const tables = lucia ? (await call(lucia, 'GET', '/kitchen/tables')).body : [];
  for (const t of Array.isArray(tables) ? tables.slice(0, 1) : []) {
    list.push([`Renombrar ${t.name} (otro restaurante)`, 'PATCH', `/kitchen/tables/${t.id}`, { name: 'x' }]);
    list.push([`Quitar ${t.name} (otro restaurante)`, 'DELETE', `/kitchen/tables/${t.id}`]);
  }
  const cashier = lucia ? (await call(lucia, 'GET', '/kitchen/cashier')).body : null;
  const ticket = cashier?.tables?.flatMap((t: { session?: { tickets: { id: string }[] } }) => t.session?.tickets ?? [])[0];
  if (ticket) {
    list.push(['Marcar que salió de cocina una comanda de otro restaurante', 'POST', `/kitchen/cashier/tickets/${ticket.id}/out`]);
    list.push(['Anular una comanda de otro restaurante', 'POST', `/kitchen/cashier/tickets/${ticket.id}/cancel`, { reason: 'OTHER' }]);
  }
  const voided = cashier?.cancelled?.[0];
  if (voided) list.push(['Marcar revisada una anulación de otro restaurante', 'POST', `/kitchen/cashier/cancelled/${voided.id}/review`]);
  list.push(['Abrir la caja (este negocio no atiende en mesas)', 'POST', '/kitchen/cashier/drawer/open', { openingCash: 1000 }]);
  list.push(['Cerrar la caja del mesero con la sesión de la dueña', 'POST', '/staff/floor/drawer/close', { counted: 0 }]);
  const luciaDrawer = lucia ? (await call(lucia, 'GET', '/kitchen/cashier/drawer')).body : null;
  const shift = luciaDrawer?.history?.[0];
  const outMove = shift?.moves?.find((m: { hasReceipt: boolean }) => m.hasReceipt);
  if (outMove) list.push(['Ver la factura de una salida de caja de otro restaurante', 'GET', `/kitchen/cashier/drawer/moves/${outMove.id}/receipt`]);
  if (shift) list.push(['Marcar revisado un turno de caja de otro restaurante', 'POST', `/kitchen/cashier/drawer/shifts/${shift.id}/review`]);
  list.push(['Anular una comanda con la sesión de la dueña', 'POST', '/staff/floor/tickets/x/cancel', { reason: 'OTHER' }]);
  list.push(['Ver el salón de los meseros con la sesión de la dueña', 'GET', '/staff/floor']);
  list.push(['Ver la pantalla de cocina con la sesión de la dueña', 'GET', '/staff/kitchen']);
  list.push(['Pedir la cuenta de una mesa con la sesión de la dueña', 'POST', '/staff/floor/sessions/x/bill']);
  list.push(['Ver la caja (este negocio no atiende en mesas)', 'GET', '/kitchen/cashier']);
  list.push(['Cobrar una mesa con la sesión de la dueña', 'POST', '/staff/floor/sessions/x/close', { tip: false, payments: [] }]);

  let failures = 0;
  for (const [label, method, path, body] of list) {
    const res = await call(espiga, method, path, body);
    const v = verdict(res);
    if (v !== 'ok') failures++;
    const msg = Array.isArray(res.body?.message) ? res.body.message.join('; ') : res.body?.message;
    console.log(`${v === 'ok' ? '✓' : '✗'} ${label}: ${res.status} ${v === 'ok' ? '' : `${v} `}— ${msg ?? ''}`);
  }

  // Lo que ve La Espiga no trae nada de Destello.
  const ids = new Set<string>(JSON.stringify(before).match(/"id":"[^"]+"/g) ?? []);
  const leaked = (JSON.stringify(own.body).match(/"id":"[^"]+"/g) ?? []).filter((id) => ids.has(id));
  console.log(`${leaked.length ? '✗' : '✓'} La cocina de La Espiga no trae datos de Destello${leaked.length ? `: ${leaked.length}` : ''}`);
  failures += leaked.length ? 1 : 0;

  const after = (await call(destello, 'GET', '/kitchen')).body;
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`${same ? '✓' : '✗'} Los datos de Cocina Destello siguen idénticos`);
  if (!same) failures++;

  console.log(failures ? `\n${failures} problema(s) de aislamiento.` : `\nAislamiento correcto: ${list.length + 2} pruebas.`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
