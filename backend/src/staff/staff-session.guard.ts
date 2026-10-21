import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { Request } from 'express';
import { StaffAuthService, type StaffSession } from './staff-auth.service';
import { SESSION_COOKIE } from './staff-rules';

export type StaffRequest = Request & { staff: StaffSession & { organizationId: string; role: StaffRole } };

// Rutas del equipo (meseros y cocina): revisa la cookie `staff_session` en cada llamada (aparato desconectado,
// persona quitada o empresa sin acceso = fuera) y deja la sesión en `req.staff`. Nunca acepta la sesión de la dueña.
@Injectable()
export class StaffSessionGuard implements CanActivate {
  constructor(private readonly auth: StaffAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<StaffRequest>();
    req.staff = await this.auth.session(req.cookies?.[SESSION_COOKIE]);
    return true;
  }
}

/** Solo la pantalla de cocina. */
export function requireKitchen(req: StaffRequest) {
  if (req.staff.role !== StaffRole.KITCHEN) throw new ForbiddenException('Esto es para la pantalla de cocina.');
  return req.staff;
}

/** Solo meseros (la pantalla de cocina no abre mesas ni pide). */
export function requireWaiter(req: StaffRequest) {
  if (req.staff.role !== StaffRole.WAITER) throw new ForbiddenException('Esto es para los meseros.');
  return req.staff;
}
