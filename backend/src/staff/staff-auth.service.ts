import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { describeDevice } from '../auth/login-alert.service';
import { afterWrongPin, isLocked, newSecret, parseDeviceCookie, sameHash, SESSION_HOURS, sha256 } from './staff-rules';

export interface StaffSession {
  sub: string;
  dev: string;
  kind: 'staff';
}

const LINK_DEAD = 'Este enlace ya no sirve. Pídele a la dueña uno nuevo.';

// Cómo entran los meseros y la pantalla de cocina (Julieth eligió el enlace de invitación, 2026-10-19):
// 1) el enlace (un solo uso, 48 h) amarra el aparato con un secreto propio en una cookie httpOnly;
// 2) cada turno, el mesero escribe su PIN en ESE aparato (la cocina no usa PIN); 5 equivocados lo bloquean 15 min;
// 3) la sesión es un JWT aparte (`kind: 'staff'`, 12 h): nunca sirve para las rutas de la dueña.
@Injectable()
export class StaffAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async claim(token: string, userAgent: string | undefined) {
    const invite = await this.prisma.staffInvite.findUnique({ where: { tokenHash: sha256(token) }, include: { staff: true } });
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) throw new UnauthorizedException(LINK_DEAD);
    const secret = newSecret();
    const device = await this.prisma.$transaction(async (tx) => {
      // Un solo uso aunque lleguen dos a la vez: solo uno logra marcarlo.
      const { count } = await tx.staffInvite.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } });
      if (!count) throw new UnauthorizedException(LINK_DEAD);
      return tx.staffDevice.create({ data: { staffId: invite.staffId, secretHash: sha256(secret), label: describeDevice(userAgent) } });
    });
    return { cookie: `${device.id}.${secret}`, profile: await this.profile(invite.staffId) };
  }

  /** El aparato de la cookie, si sigue conectado y su empresa puede usar Destello. */
  async device(cookie: string | undefined) {
    const parsed = parseDeviceCookie(cookie);
    if (!parsed) throw new UnauthorizedException('Este aparato no está conectado.');
    const device = await this.prisma.staffDevice.findUnique({ where: { id: parsed.id }, include: { staff: { include: { organization: true } } } });
    if (!device || !sameHash(parsed.secret, device.secretHash)) throw new UnauthorizedException('Este aparato no está conectado.');
    const org = device.staff.organization;
    if (!org.active || org.approvalPending) throw new ForbiddenException('El restaurante no tiene el acceso activo. Avísale a la dueña.');
    return device;
  }

  async login(cookie: string | undefined, pin: string | undefined) {
    const device = await this.device(cookie);
    const now = new Date();
    if (device.staff.role === StaffRole.WAITER) {
      if (isLocked(device.lockedUntil, now)) throw new ForbiddenException('Demasiados intentos. Espera 15 minutos o pídele ayuda a la dueña.');
      if (!pin || !device.staff.pinHash || !(await bcrypt.compare(pin, device.staff.pinHash))) {
        const next = afterWrongPin(device.failedPins, now);
        await this.prisma.staffDevice.update({ where: { id: device.id }, data: next });
        throw new UnauthorizedException(next.lockedUntil ? 'Demasiados intentos. Espera 15 minutos.' : 'El PIN no coincide.');
      }
    }
    await this.prisma.staffDevice.update({ where: { id: device.id }, data: { failedPins: 0, lockedUntil: null, lastSeenAt: now } });
    const payload: StaffSession = { sub: device.staffId, dev: device.id, kind: 'staff' };
    const token = await this.jwt.signAsync(payload, { expiresIn: `${SESSION_HOURS}h` });
    return { token, profile: await this.profile(device.staffId) };
  }

  /** Revisa la sesión en cada llamada: aparato desconectado o persona quitada = fuera, sin esperar a que venza. */
  async session(token: string | undefined): Promise<StaffSession & { organizationId: string; role: StaffRole }> {
    if (!token) throw new UnauthorizedException('Entra con tu PIN.');
    let payload: StaffSession;
    try {
      payload = await this.jwt.verifyAsync<StaffSession>(token);
    } catch {
      throw new UnauthorizedException('Entra con tu PIN.');
    }
    if (payload.kind !== 'staff') throw new UnauthorizedException('Entra con tu PIN.');
    const device = await this.prisma.staffDevice.findUnique({ where: { id: payload.dev }, include: { staff: { include: { organization: true } } } });
    if (!device || device.staffId !== payload.sub) throw new UnauthorizedException('Este aparato fue desconectado.');
    const org = device.staff.organization;
    if (!org.active || org.approvalPending) throw new ForbiddenException('El restaurante no tiene el acceso activo. Avísale a la dueña.');
    return { ...payload, organizationId: org.id, role: device.staff.role };
  }

  async profile(staffId: string) {
    const staff = await this.prisma.staffMember.findUniqueOrThrow({ where: { id: staffId }, include: { organization: true } });
    return { name: staff.name, role: staff.role, organizationName: staff.organization.name, palette: staff.organization.palette };
  }
}
