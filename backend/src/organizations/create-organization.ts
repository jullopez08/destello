import { Plan, Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface NewOrganization {
  name: string;
  slug: string;
  palette?: string;
  /** ¿Atiende clientes en mesas? (enciende mesas y meseros) */
  servesTables?: boolean;
  whatsapp?: string;
  approvalPending?: boolean;
  /** Creada por el super admin: ya la conoce, nace verificada */
  verified?: boolean;
  plan: Plan;
  owner: { name: string; email: string; passwordHash: string; termsVersion?: string };
}

// La empresa, su suscripción y la cuenta de la dueña nacen juntas: una cocina
// nunca existe sin plan ni sin quien la maneje. La usan el super admin
// (POST /organizations) y la inscripción por la página (SignupService).
export async function createOrganizationWithOwner(tx: Prisma.TransactionClient, input: NewOrganization) {
  const organization = await tx.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      palette: input.palette ?? 'vainilla',
      servesTables: input.servesTables ?? false,
      whatsapp: input.whatsapp,
      approvalPending: input.approvalPending ?? false,
      verifiedAt: input.verified ? new Date() : null,
    },
  });

  const owner = await tx.user.create({
    data: {
      email: input.owner.email,
      name: input.owner.name,
      password: input.owner.passwordHash,
      roles: [Role.ADMIN],
      organizationId: organization.id,
      // Inscrita por la página: aceptó los términos al inscribirse.
      ...(input.owner.termsVersion ? { termsAcceptedAt: new Date(), termsVersion: input.owner.termsVersion } : {}),
    },
  });

  await tx.subscription.create({
    data: {
      organizationId: organization.id,
      planId: input.plan.id,
      status: input.plan.isTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
      currentPeriodEnd: new Date(Date.now() + input.plan.durationDays * MS_PER_DAY),
      billingContactUserId: owner.id,
    },
  });

  return { organization, owner };
}

// "Panadería La Espiga" → "panaderia-la-espiga"; si ya existe, con un final al azar.
export async function freeSlug(db: Prisma.TransactionClient, name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'negocio';
  for (let slug = base; ; slug = `${base}-${randomBytes(2).toString('hex')}`) {
    if (!(await db.organization.findUnique({ where: { slug } }))) return slug;
  }
}
