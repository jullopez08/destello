import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { handleUniqueConstraint } from '../common/utils/prisma-errors.util';
import type { CurrentUserData } from '../common/decorators/current-user.decorator';
import { purgeOrganizationData } from '../data-retention/purge-organization-data';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { createOrganizationWithOwner } from './create-organization';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';


const OWNER_SELECT = { id: true, name: true, email: true, active: true, termsAcceptedAt: true } as const;
const ORGANIZATION_INCLUDE = {
  subscription: { include: { plan: true } },
  users: { where: { roles: { has: Role.ADMIN } }, select: OWNER_SELECT },
} as const;

@Injectable()
export class OrganizationsService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // Crea la empresa, su suscripción y la cuenta de la dueña en una sola
  // transacción. La dueña queda como contacto de facturación.
  async create(dto: CreateOrganizationDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });

    if (!plan) {
      throw new BadRequestException('El plan especificado no existe.');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.ownerEmail } });
    if (existingEmail) {
      throw new BadRequestException('Ya existe una cuenta con ese correo.');
    }

    const passwordHash = await bcrypt.hash(dto.ownerPassword, 10);

    return handleUniqueConstraint(async () => {
      return this.prisma.$transaction(async (tx) => {
        const { organization } = await createOrganizationWithOwner(tx, {
          name: dto.name,
          slug: dto.slug,
          palette: dto.palette,
          servesTables: dto.servesTables,
          plan,
          owner: { name: dto.ownerName, email: dto.ownerEmail, passwordHash },
        });

        return tx.organization.findUniqueOrThrow({ where: { id: organization.id }, include: ORGANIZATION_INCLUDE });
      });
    }, 'Ya existe una empresa con ese identificador.');
  }

  findAll() {
    return this.prisma.organization.findMany({
      include: ORGANIZATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: ORGANIZATION_INCLUDE,
    });

    if (!organization) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);

    return handleUniqueConstraint(
      () => this.prisma.organization.update({
        where: { id },
        data: dto,
        include: ORGANIZATION_INCLUDE,
      }),
      'Ya existe una empresa con ese identificador.',
    );
  }

  // Aprueba una inscripción en revisión y le avisa a la dueña por correo (solo la primera vez).
  async approve(id: string) {
    const organization = await this.findOne(id);
    const { count } = await this.prisma.organization.updateMany({ where: { id, approvalPending: true }, data: { approvalPending: false } });
    const owners = organization.users.filter((u) => u.active).map((u) => u.email);
    if (count && owners.length) {
      const site = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
      await this.email.sendApprovedNotice(owners, organization.name, `${site}/access`);
    }
    return this.findOne(id);
  }

  // DESTRUCTIVO: borra la empresa y todo lo que cuelga de ella, lo mismo que
  // hace DataRetentionCron a los 6 meses de quedar inactiva. Si la suscripción
  // ya no está en prueba, solo se permite con la empresa inactiva, para no
  // borrar una pastelería real por error.

  async remove(id: string) {
    const organization = await this.findOne(id);
    const { subscription } = organization;

    if (organization.active && subscription && subscription.status !== SubscriptionStatus.TRIALING) {
      throw new BadRequestException(
        'Esta empresa está activa y su suscripción no está en prueba. Para borrar sus datos, primero cancele su suscripción y luego vuelva a intentarlo.',
      );
    }

    return this.prisma.$transaction((tx) => purgeOrganizationData(tx, id));
  }

  async getOwnBranding(currentUser: CurrentUserData) {
    const organization = await this.requireOwnOrganization(currentUser);
    return { name: organization.name, palette: organization.palette, logoUrl: organization.logoUrl };
  }

  async updateOwnBranding(currentUser: CurrentUserData, dto: UpdateBrandingDto) {
    const organization = await this.requireOwnOrganization(currentUser);

    const updated = await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        ...(dto.palette !== undefined ? { palette: dto.palette } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
      },
    });

    return { name: updated.name, palette: updated.palette, logoUrl: updated.logoUrl };
  }

  private async requireOwnOrganization(currentUser: CurrentUserData) {
    if (!currentUser.organizationId) {
      throw new ForbiddenException('Esta cuenta no pertenece a ninguna empresa.');
    }

    const organization = await this.prisma.organization.findUnique({ where: { id: currentUser.organizationId } });

    if (!organization) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    return organization;
  }
}
