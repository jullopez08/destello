import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessType, StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/staff.dto';
import { INVITE_MS, newPin, newSecret, sha256 } from './staff-rules';

// Lo que hace la dueña con su equipo (Configuración → Tu equipo): crear meseros y pantallas de cocina,
// mandarles el enlace, cambiar el PIN, desconectar aparatos y quitar a alguien. Todo dentro de su empresa.
@Injectable()
export class StaffAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const staff = await this.prisma.staffMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        devices: { orderBy: { createdAt: 'asc' }, select: { id: true, label: true, lastSeenAt: true, lockedUntil: true } },
        invites: { where: { usedAt: null, expiresAt: { gt: new Date() } }, select: { expiresAt: true } },
      },
    });
    return staff.map(({ id, name, role, pinHash, devices, invites }) => ({
      id,
      name,
      role,
      hasPin: !!pinHash,
      devices,
      inviteExpiresAt: invites[0]?.expiresAt ?? null,
    }));
  }

  async create(organizationId: string, dto: CreateStaffDto) {
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (organization.businessType !== BusinessType.RESTAURANT) {
      throw new BadRequestException('Los meseros y la pantalla de cocina son para restaurantes con mesas.');
    }
    // El PIN se muestra solo esta vez (se guarda cifrado): la dueña se lo dice al mesero.
    const pin = dto.role === StaffRole.WAITER ? newPin() : null;
    const staff = await this.prisma.staffMember.create({
      data: { organizationId, name: dto.name.trim(), role: dto.role, pinHash: pin ? await bcrypt.hash(pin, 10) : null },
    });
    return { list: await this.list(organizationId), id: staff.id, pin };
  }

  /** PIN nuevo (el anterior deja de servir); se muestra solo esta vez. */
  async newPin(organizationId: string, id: string) {
    const staff = await this.own(organizationId, id);
    if (staff.role !== StaffRole.WAITER) throw new BadRequestException('La pantalla de cocina no usa PIN.');
    const pin = newPin();
    await this.prisma.staffMember.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10) } });
    return { pin };
  }

  /** Enlace nuevo de un solo uso (48 h). Los anteriores sin usar dejan de servir. Solo se muestra esta vez:
   *  se devuelve el token y el panel arma el enlace con su propia dirección (la que ve la dueña). */
  async invite(organizationId: string, id: string) {
    await this.own(organizationId, id);
    const token = newSecret();
    const expiresAt = new Date(Date.now() + INVITE_MS);
    await this.prisma.$transaction([
      this.prisma.staffInvite.deleteMany({ where: { staffId: id, usedAt: null } }),
      this.prisma.staffInvite.create({ data: { staffId: id, tokenHash: sha256(token), expiresAt } }),
    ]);
    return { token, expiresAt };
  }

  async removeDevice(organizationId: string, id: string, deviceId: string) {
    await this.own(organizationId, id);
    const { count } = await this.prisma.staffDevice.deleteMany({ where: { id: deviceId, staffId: id } });
    if (!count) throw new NotFoundException('Aparato no encontrado.');
    return this.list(organizationId);
  }

  async remove(organizationId: string, id: string) {
    await this.own(organizationId, id);
    await this.prisma.staffMember.delete({ where: { id } });
    return this.list(organizationId);
  }

  private async own(organizationId: string, id: string) {
    const staff = await this.prisma.staffMember.findUnique({ where: { id } });
    if (!staff || staff.organizationId !== organizationId) throw new NotFoundException('No está en tu equipo.');
    return staff;
  }
}
