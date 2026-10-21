import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// Same TTL reasoning as Appointment.rescheduleToken (short enough to bound
// how long a link sitting in an inbox stays useful), and single-use for the
// same reason: this is a security-sensitive action, not a browsing session.
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// Backs POST /auth/forgot-password and POST /auth/reset-password. Kept
// separate from AuthService (which owns login/session concerns) the same
// way AppointmentSelfServiceService is kept separate from AppointmentService
// — a distinct concern (opaque token lifecycle) layered on top of the User
// model rather than folded into the service that already has a lot in it.
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // Always resolves the same way regardless of whether `email` matches an
  // account — the caller (AuthController) returns one generic message no
  // matter what, so there is nothing here to distinguish either. Silently
  // does nothing for an unknown email (no token minted, no email sent) —
  // that's the entire point of this endpoint never revealing account
  // existence.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.active) {
      return;
    }

    const resetLink = await this.issueResetLink(user.id, RESET_TOKEN_TTL_MS);
    await this.emailService.sendPasswordResetEmail(user.email, resetLink);
  }

  // Genera un enlace de un solo uso para cambiar la contraseña. También lo usa
  // el aviso de inicio de sesión ("No fui yo", LoginAlertService). Un enlace
  // nuevo reemplaza al anterior.
  // En la base va la huella (sha256) del enlace, no el enlace: si alguien copiara la base, no podría usar uno vigente.
  async issueResetLink(userId: string, ttlMs: number): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordResetToken: resetTokenHash(token), passwordResetTokenExpiresAt: new Date(Date.now() + ttlMs) },
    });

    const frontendUrl = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
    return `${frontendUrl}/access/reset-password/${token}`;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: resetTokenHash(token) } });
    const expired = !user?.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt.getTime() < Date.now();

    if (!user || expired) {
      throw new BadRequestException('Este enlace ya no es válido. Solicita uno nuevo.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cambiar la contraseña cierra todas las sesiones abiertas (JwtStrategy
    // rechaza los tokens emitidos antes de sessionsInvalidatedAt): si alguien
    // entró con la contraseña anterior, queda fuera de inmediato.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        sessionsInvalidatedAt: new Date(),
      },
    });
  }
}

export const resetTokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
