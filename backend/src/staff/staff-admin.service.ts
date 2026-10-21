import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/staff.dto';
import { newPin, newSecret, sha256 } from './staff-rules';

// Lo que hace la dueña con su equipo (Configuración → Tu equipo): crear meseros y pantallas de cocina,
// mandarles su enlace fijo, cambiar el enlace o el PIN, desconectar aparatos y quitar a alguien. Todo dentro de su empresa.
@Injectable()
export class StaffAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    const staff = await this.prisma.staffMember.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        devices: { orderBy: { createdAt: 'asc' }, select: { id: true, label: true, lastSeenAt: true, lockedUntil: true } },
      },
    });
    return staff.map(({ id, name, role, pinHash, linkHash, linkLockedUntil, cashier, devices }) => ({
      id,
      name,
      role,
      hasPin: !!pinHash,
      hasLink: !!linkHash,
      linkLockedUntil,
      cashier,
      devices,
    }));
  }

  async create(organizationId: string, dto: CreateStaffDto) {
    const organization = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    // La pantalla de cocina sirve a todos; los meseros, solo si atiende en mesas (Julieth, 2026-10-19).
    if (dto.role === StaffRole.WAITER && !organization.servesTables) {
      throw new BadRequestException('Los meseros son para negocios que atienden en mesas. Actívalo en Configuración.');
    }
    // El PIN y el enlace se muestran solo esta vez (se guardan cifrados): van en el mensaje de WhatsApp.
    const pin = newPin();
    const token = newSecret();
    const staff = await this.prisma.staffMember.create({
      data: { organizationId, name: dto.name.trim(), role: dto.role, pinHash: await bcrypt.hash(pin, 10), linkHash: sha256(token) },
    });
    return { list: await this.list(organizationId), id: staff.id, pin, token };
  }

  /** PIN nuevo (el anterior deja de servir); se muestra solo esta vez. */
  async newPin(organizationId: string, id: string) {
    await this.own(organizationId, id);
    const pin = newPin();
    await this.prisma.staffMember.update({ where: { id }, data: { pinHash: await bcrypt.hash(pin, 10), linkFails: 0, linkLockedUntil: null } });
    return { pin };
  }

  /** Enlace fijo nuevo: el anterior deja de servir (los aparatos ya conectados siguen). Solo se muestra esta vez:
   *  se devuelve el token y el panel arma el enlace con su propia dirección (la que ve la dueña). */
  async newLink(organizationId: string, id: string) {
    await this.own(organizationId, id);
    const token = newSecret();
    await this.prisma.staffMember.update({ where: { id }, data: { linkHash: sha256(token), linkFails: 0, linkLockedUntil: null } });
    return { token };
  }

  /** Encargado de caja (solo meseros): cobra cualquier mesa. Se aplica en su siguiente llamada (la sesión lo lee de la BD). */
  async setCashier(organizationId: string, id: string, cashier: boolean) {
    const staff = await this.own(organizationId, id);
    if (staff.role !== 'WAITER') throw new BadRequestException('Solo un mesero puede ser encargado de caja.');
    await this.prisma.staffMember.update({ where: { id }, data: { cashier } });
    return this.list(organizationId);
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
