// One-time manual script — NOT part of automatic seeding (src/seed, or
// multi-tenant-demo.seed.ts), and not wired into any npm script on purpose
// so it can't run by accident.
//
// Creates ONLY a SUPER_ADMIN user (see prisma/schema.prisma's User.organizationId
// comment: "null only for SUPER_ADMIN") — no organization, no demo data, nothing
// else. Safe to run against a freshly migrated, completely empty database.
//
// Usage:
//   npx ts-node src/scripts/create-superadmin.ts --email=real@correo.com [--name="Nombre Completo"] [--password=algo]
//
// - --email is required.
// - --name is optional; if omitted, you'll be asked for it interactively.
// - --password is optional. If omitted, you'll be prompted twice (entry +
//   confirmation) with the terminal input hidden. If your terminal has no
//   TTY (e.g. running through a non-interactive pipe), pass --password
//   instead — but rotate it (change it) right after your first login, since
//   it will have been visible in your shell history/process list.
//
// The password is never written to any log, and this script never prints
// it back.

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

// Same minimum enforced by CreateUserDto/ChangePasswordDto/ResetPasswordDto.
const MIN_PASSWORD_LENGTH = 8;

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

// Masks keystrokes on-screen while readline still builds up the full typed
// value internally, so the plaintext password is never echoed to the
// terminal. Requires a real TTY on stdin (readline puts a TTY into raw mode,
// which is what suppresses the OS's own echo in the first place) — if
// stdin isn't a TTY, this rejects so the caller can fall back to --password.
function askHidden(query: string): Promise<string> {
  if (!process.stdin.isTTY) {
    return Promise.reject(
      new Error(
        'No hay una terminal interactiva (TTY) disponible para pedir la contraseña oculta. ' +
          'Vuelve a correr el script pasando --password=... (rota la contraseña después, ya que quedará visible en tu historial de comandos).',
      ),
    );
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let masking = false;
    const onData = () => {
      if (!masking) return;
      const currentLine = (rl as unknown as { line: string }).line;
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(query + '*'.repeat(currentLine.length));
    };
    process.stdin.on('data', onData);
    masking = true;
    rl.question(query, (value) => {
      masking = false;
      process.stdin.removeListener('data', onData);
      rl.close();
      process.stdout.write('\n');
      resolve(value);
    });
  });
}

async function main() {
  const args = parseArgs();

  const email = args.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Falta --email=<correo-real-del-super-admin>.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${email}" no parece un correo válido.`);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Ya existe un usuario con el correo "${email}" (id: ${existing.id}). No se creó nada nuevo.`);
  }

  const name = (args.name ?? (await askVisible('Nombre completo del Super Admin: '))).trim();
  if (!name) {
    throw new Error('El nombre no puede estar vacío.');
  }

  let password = args.password;
  const passwordFromArgv = !!password;
  if (!password) {
    password = await askHidden('Contraseña del Super Admin (no se mostrará en pantalla): ');
    const confirmation = await askHidden('Confirma la contraseña: ');
    if (password !== confirmation) {
      throw new Error('Las contraseñas no coinciden. No se creó ningún usuario.');
    }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      roles: [Role.SUPER_ADMIN],
      organizationId: null,
    },
  });

  console.log(`Super Admin creado correctamente: ${user.email} (id: ${user.id}). La contraseña no fue registrada en ningún log.`);
  if (passwordFromArgv) {
    console.log('Advertencia: la contraseña se pasó como argumento de línea de comandos (visible en tu historial de shell). Rótala apenas inicies sesión.');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
