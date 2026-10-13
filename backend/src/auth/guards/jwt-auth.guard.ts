
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // Passport's default handleRequest throws a bare UnauthorizedException
  // ("Unauthorized") on a missing/expired/invalid token, which used to reach
  // the frontend and render verbatim in English — every other backend
  // message in this app is Spanish, so this one shouldn't be the exception.
  handleRequest<TUser = unknown>(err: unknown, user: TUser | false): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
    }
    return user;
  }
}