import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hasRole } from '../../common/auth/roles.util';


function extractFromCookies(req: Request): string | null {
  return req?.cookies?.['access_token'] ?? null
}

// The only calls a organization ADMIN who hasn't accepted the legal documents yet
// can make — enough to restore the session, show the consent screen
// (frontend TermsConsentScreen), accept, or log out instead.
const TERMS_EXEMPT_ROUTES = new Set([
  'GET /auth/me',
  'POST /auth/accept-terms',
  'POST /auth/logout',
]);

function isTermsExempt(req: Request): boolean {
  const path = req.path.replace(/\/+$/, '') || '/';
  return TERMS_EXEMPT_ROUTES.has(`${req.method} ${path}`);
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  organizationId: string | null;
  // Standard JWT claims, added automatically by JwtService.signAsync — not
  // declared when we build the payload to sign, but always present on the
  // decoded token passport-jwt hands to validate() below.
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {

    super({

      jwtFromRequest: extractFromCookies,

      ignoreExpiration: false,

      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),

      passReqToCallback: true,

    });

  }

  // A valid signature + not expired isn't enough on its own anymore: a
  // logout (see AuthController.logout) stamps User.sessionsInvalidatedAt,
  // and any token issued before that stamp must stop working immediately,
  // not just wait out its original 24h expiry.
  //
  // It's also where the terms-of-service enforcement lives: every
  // JWT-protected route in the app runs through this strategy (via
  // JwtAuthGuard), so checking here makes it global for authenticated calls
  // without a second DB read per request — a plain APP_GUARD would run
  // before JwtAuthGuard and never see the user. Roles and termsAcceptedAt
  // are read from the DB, not the token, so granting ADMIN or accepting the
  // terms takes effect without logging in again.
  async validate(req: Request, payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        sessionsInvalidatedAt: true,
        roles: true,
        termsAcceptedAt: true,
      },
    });

    // payload.iat is whole seconds (JWT spec — NumericDate has no sub-second
    // precision), but sessionsInvalidatedAt is a millisecond-precision Date.
    // Comparing them directly made a token issued a few hundred ms *after*
    // a logout get rejected anyway, whenever the login and the preceding
    // logout landed in the same wall-clock second: iat gets floored to that
    // second's :00.000, which comes out "before" sessionsInvalidatedAt's
    // later millisecond within that same second, even though the token is
    // genuinely newer. Flooring sessionsInvalidatedAt to whole seconds too
    // puts both sides on the same granularity, so a same-second re-login
    // (logout → login within ~1s, e.g. on the login screen after logging
    // out) is treated as valid instead of being spuriously rejected as an
    // "expired session" one request later.
    const invalidatedAtSec = user?.sessionsInvalidatedAt
      ? Math.floor(user.sessionsInvalidatedAt.getTime() / 1000)
      : null;

    if (invalidatedAtSec !== null && payload.iat < invalidatedAtSec) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    if (
      user &&
      hasRole(user, Role.ADMIN) &&
      !hasRole(user, Role.SUPER_ADMIN) &&
      !user.termsAcceptedAt &&
      !isTermsExempt(req)
    ) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'terms_not_accepted',
        message:
          'Debes aceptar los Términos y condiciones y la Política de privacidad para continuar.',
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      organizationId: payload.organizationId,
      // Lets AuthController.me() tell the frontend exactly when THIS token
      // expires (ms epoch), so it can schedule a live logout timer instead
      // of guessing a fixed TTL that could drift from the real one.
      exp: payload.exp,
    };

  }

}
