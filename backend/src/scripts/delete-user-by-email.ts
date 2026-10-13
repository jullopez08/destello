// One-time manual script — NOT part of automatic seeding, and not wired into
// any npm script on purpose so it can't run by accident.
//
// Deletes exactly ONE user by exact email match. Meant for cases like: a
// Super Admin mistypes their password while creating their account (typed
// blind, see create-superadmin.ts) and can't log in, and can't just rerun
// create-superadmin.ts because it refuses duplicate emails. This script
// clears the way so it can be rerun cleanly.
//
// Requires typing an explicit "CONFIRMAR" after seeing the matched user's
// name/role printed on screen, so a typo in --email doesn't silently delete
// the wrong account.
//
// Usage:
//   npx ts-node src/scripts/delete-user-by-email.ts --email=correo@ejemplo.com

import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) {
      args[match[1]] = match[2];
    }
  }
  return args;
}

function askVisible(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (value) => {
      rl.close();
      resolve(value);
    });
  });
}

async function main() {
  const args = parseArgs();

  const email = args.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Falta --email=<correo-del-usuario-a-borrar>.');
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No existe ningún usuario con el correo "${email}". No se borró nada.`);
  }

  console.log(`Usuario encontrado:`);
  console.log(`  Nombre: ${user.name}`);
  console.log(`  Roles: ${user.roles.join(', ') || '(ninguno)'}`);
  console.log(`  Id: ${user.id}`);
  console.log('');

  const confirmation = await askVisible(`Escribe CONFIRMAR para borrar a ${email}: `);
  if (confirmation.trim() !== 'CONFIRMAR') {
    throw new Error('Confirmación no coincide con "CONFIRMAR". No se borró nada.');
  }

  await prisma.user.delete({ where: { id: user.id } });

  console.log(`Usuario "${email}" borrado correctamente.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
