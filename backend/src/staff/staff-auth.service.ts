import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, StaffMember } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { describeDevice } from '../auth/login-alert.service';
import { afterWrongPin, isLocked, newSecret, parseDeviceCookie, sameHash, SESSION_HOURS, sha256 } from './staff-rules';

export interface StaffSession {
  sub: string;
  dev: string;
  kind: 'staff';
}

const LINK_DEAD = 'Este enlace ya no sirve. Pídele a la dueña el nuevo.';
const LOCKED = 'Demasiados intentos. Espera 15 minutos o pídele ayuda a la dueña.';
const NO_PIN = 'Aún no tienes PIN. Pídele a la dueña que te cree uno.';

// Cómo entran los meseros y la pantalla de cocina (Julieth, 2026-10-20, después de probar el enlace de un solo uso:
// abierto desde WhatsApp quedaba en el navegador de WhatsApp y en Chrome o en la app había que pedir otro):
// 1) cada persona tiene un enlace fijo que sirve muchas veces, siempre con su PIN; con el PIN correcto ese navegador
//    queda conectado (cookie httpOnly con un secreto propio) y a la dueña le llega un aviso del aparato nuevo;
// 2) cada turno se escribe el PIN en ese aparato; 5 equivocados lo bloquean 15 min (en el enlace, a la persona);
// 3) la sesión es un JWT aparte (`kind: 'staff'`, 12 h): nunca sirve para las rutas de la dueña.
@Injectable()
export class StaffAuthService {
  private readonly logger = new Logger(StaffAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
  ) {}

  /** De quién es el enlace (para saludarlo antes del PIN). */
  async link(token: string) {
    const staff = await this.prisma.staffMember.findUnique({ where: { linkHash: sha256(token) } });
    if (!staff) throw new UnauthorizedException(LINK_DEAD);
    await this.activeOrganization(staff.organizationId);
    return this.profile(staff.id);
  }

  /** Enlace + PIN: conecta este navegador y abre el turno. Si ya estaba conectado para esa persona, no crea otro. */
  async claim(token: string, pin: string, cookie: string | undefined, userAgent: string | undefined) {
    const staff = await this.prisma.staffMember.findUnique({ where: { linkHash: sha256(token) } });
    if (!staff) throw new UnauthorizedException(LINK_DEAD);
    await this.activeOrganization(staff.organizationId);
    const now = new Date();
    if (isLocked(staff.linkLockedUntil, now)) throw new ForbiddenException(LOCKED);
    if (!(await this.pinMatches(staff, pin))) {
      const next = afterWrongPin(staff.linkFails, now);
      await this.prisma.staffMember.update({ where: { id: staff.id }, data: { linkFails: next.failedPins, linkLockedUntil: next.lockedUntil } });
      throw new UnauthorizedException(next.lockedUntil ? LOCKED : 'El PIN no coincide.');
    }
    await this.prisma.staffMember.update({ where: { id: staff.id }, data: { linkFails: 0, linkLockedUntil: null } });

    const current = await this.knownDevice(cookie);
    if (current?.staffId === staff.id) return { cookie: null, ...(await this.open(current.id, staff.id)) };
    const secret = newSecret();
    const label = describeDevice(userAgent);
    const device = await this.prisma.staffDevice.create({ data: { staffId: staff.id, secretHash: sha256(secret), label } });
    this.warnOwner(staff, label);
    return { cookie: `${device.id}.${secret}`, ...(await this.open(device.id, staff.id)) };
  }

  /** El aparato de la cookie, si sigue conectado y su empresa puede usar Destello. */
  async device(cookie: string | undefined) {
    const device = await this.knownDevice(cookie);
    if (!device) throw new UnauthorizedException('Este aparato no está conectado.');
    await this.activeOrganization(device.staff.organizationId);
    return device;
  }

  async login(cookie: string | undefined, pin: string) {
    const device = await this.device(cookie);
    const now = new Date();
    if (isLocked(device.lockedUntil, now)) throw new ForbiddenException(LOCKED);
    if (!(await this.pinMatches(device.staff, pin))) {
      const next = afterWrongPin(device.failedPins, now);
      await this.prisma.staffDevice.update({ where: { id: device.id }, data: next });
      throw new UnauthorizedException(next.lockedUntil ? LOCKED : 'El PIN no coincide.');
    }
    return this.open(device.id, device.staffId);
  }

  /** Revisa la sesión en cada llamada: aparato desconectado o persona quitada = fuera, sin esperar a que venza. */
  async session(token: string | undefined): Promise<StaffSession & { organizationId: string; role: StaffMember['role'] }> {
    if (!token) throw new UnauthorizedException('Entra con tu PIN.');
    let payload: StaffSession;
    try {
      payload = await this.jwt.verifyAsync<StaffSession>(token);
    } catch {
      throw new UnauthorizedException('Entra con tu PIN.');
    }
    if (payload.kind !== 'staff') throw new UnauthorizedException('Entra con tu PIN.');
    const device = await this.prisma.staffDevice.findUnique({ where: { id: payload.dev }, include: { staff: true } });
    if (!device || device.staffId !== payload.sub) throw new UnauthorizedException('Este aparato fue desconectado.');
    const org = await this.activeOrganization(device.staff.organizationId);
    return { ...payload, organizationId: org.id, role: device.staff.role };
  }

  async profile(staffId: string) {
    const staff = await this.prisma.staffMember.findUniqueOrThrow({ where: { id: staffId }, include: { organization: true } });
    return { name: staff.name, role: staff.role, organizationName: staff.organization.name, palette: staff.organization.palette };
  }

  private async knownDevice(cookie: string | undefined) {
    const parsed = parseDeviceCookie(cookie);
    if (!parsed) return null;
    const device = await this.prisma.staffDevice.findUnique({ where: { id: parsed.id }, include: { staff: true } });
    return device && sameHash(parsed.secret, device.secretHash) ? device : null;
  }

  private async activeOrganization(organizationId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    if (!org.active || org.approvalPending) throw new ForbiddenException('El negocio no tiene el acceso activo. Avísale a la dueña.');
    return org;
  }

  private async pinMatches(staff: StaffMember, pin: string) {
    if (!staff.pinHash) throw new UnauthorizedException(NO_PIN);
    return bcrypt.compare(pin, staff.pinHash);
  }

  private async open(deviceId: string, staffId: string) {
    await this.prisma.staffDevice.update({ where: { id: deviceId }, data: { failedPins: 0, lockedUntil: null, lastSeenAt: new Date() } });
    const payload: StaffSession = { sub: staffId, dev: deviceId, kind: 'staff' };
    const token = await this.jwt.signAsync(payload, { expiresIn: `${SESSION_HOURS}h` });
    return { token, profile: await this.profile(staffId) };
  }

  /** Así se da cuenta la dueña si el enlace y el PIN se filtraron. Nunca hace fallar la entrada. */
  private warnOwner(staff: StaffMember, device: string) {
    this.prisma.user
      .findMany({ where: { organizationId: staff.organizationId, roles: { has: Role.ADMIN } }, select: { email: true } })
      .then((owners) => owners.length ? this.email.sendStaffDeviceNotice(owners.map((o) => o.email), { staffName: staff.name, device }) : undefined)
      .catch((error: unknown) => this.logger.warn(`Aviso de aparato nuevo sin enviar: ${String(error)}`));
  }
}
