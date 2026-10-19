import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtStrategy, JwtPayload } from './jwt.strategy';

function strategyWith(user: object | null) {
  const config: any = { getOrThrow: () => 'secreto-de-prueba' };
  const prisma: any = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
  return new JwtStrategy(config, prisma);
}

const req = (method: string, path: string): any => ({ method, path });
const iat = Math.floor(Date.now() / 1000);
const payload: JwtPayload = {
  sub: 'u1', email: 'duena@x.test', roles: [Role.ADMIN, Role.SUPER_ADMIN], organizationId: 'otra', iat, exp: iat + 3600,
};
const owner = { sessionsInvalidatedAt: null, roles: [Role.ADMIN], organizationId: 'org1', termsAcceptedAt: new Date() };

describe('JwtStrategy.validate', () => {
  it('rechaza el token de un usuario borrado', async () => {
    await expect(strategyWith(null).validate(req('GET', '/kitchen'), payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un token emitido antes de cerrar sesión', async () => {
    const user = { ...owner, sessionsInvalidatedAt: new Date((iat + 60) * 1000) };
    await expect(strategyWith(user).validate(req('GET', '/kitchen'), payload)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('toma roles y empresa de la BD, no del token', async () => {
    const session = await strategyWith(owner).validate(req('GET', '/kitchen'), payload);
    expect(session.roles).toEqual([Role.ADMIN]);
    expect(session.organizationId).toBe('org1');
  });

  it('la dueña sin términos aceptados solo puede ver su sesión, aceptarlos o salir', async () => {
    const strategy = strategyWith({ ...owner, termsAcceptedAt: null });
    await expect(strategy.validate(req('GET', '/kitchen'), payload)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(strategy.validate(req('POST', '/auth/accept-terms'), payload)).resolves.toBeTruthy();
  });
});
