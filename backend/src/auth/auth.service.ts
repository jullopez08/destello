import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';

const USER_INCLUDE = {
  organization: { select: { name: true, palette: true, logoUrl: true } },
} as const;

type UserWithOrganization = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    const accessToken = await this.generateAccessToken(user);
    return { accessToken, user: this.buildUserResponse(user), expiresAt: this.getTokenExpiryMs(accessToken) };
  }

  // Lee el `exp` del propio token: la cookie, el JWT y el temporizador del
  // frontend nunca se desfasan.
  getTokenExpiryMs(accessToken: string): number {
    const decoded = this.jwtService.decode(accessToken) as { exp: number };
    return decoded.exp * 1000;
  }

  // POST /auth/logout: JwtStrategy rechaza todo token emitido antes de esta
  // fecha, así cerrar sesión invalida el token en el servidor.
  async invalidateSessions(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionsInvalidatedAt: new Date() },
    });
  }

  // Nueva sesión para quien ya probó quién es (p. ej. justo después de cambiar
  // su contraseña con la actual).
  async issueSession(userId: string): Promise<{ accessToken: string; expiresAt: number }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: USER_INCLUDE });
    const accessToken = await this.generateAccessToken(user);
    return { accessToken, expiresAt: this.getTokenExpiryMs(accessToken) };
  }

  // GET /auth/me: relee el usuario de la BD para que una cuenta desactivada
  // salga en la siguiente recarga.
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });

    if (!user || !user.active) {
      throw new UnauthorizedException('Sesión inválida.');
    }

    return this.buildUserResponse(user);
  }

  // POST /auth/accept-terms: guarda cuándo y qué versión aceptó.
  async acceptTerms(userId: string, termsVersion: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { termsAcceptedAt: new Date(), termsVersion },
      include: USER_INCLUDE,
    });

    return this.buildUserResponse(user);
  }

  private async validateUser(email: string, password: string): Promise<UserWithOrganization> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: USER_INCLUDE });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.active) {
      throw new UnauthorizedException('El usuario está inactivo');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return user;
  }

  private async generateAccessToken(user: UserWithOrganization): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      organizationId: user.organizationId,
    };

    return this.jwtService.signAsync(payload);
  }

  private buildUserResponse(user: UserWithOrganization) {
    const {
      password: _password,
      organization,
      passwordResetToken: _token,
      passwordResetTokenExpiresAt: _tokenExpiresAt,
      ...rest
    } = user;

    return {
      ...rest,
      organizationName: organization?.name ?? null,
      palette: organization?.palette ?? null,
      logoUrl: organization?.logoUrl ?? null,
    };
  }
}
