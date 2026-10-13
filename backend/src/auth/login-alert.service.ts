import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { PasswordResetService } from './password-reset.service';

// Cookie que marca este navegador como "ya conocido" para una cuenta. Solo
// guarda `${userId}.${firma}`: la firma (HMAC con JWT_SECRET) impide
// fabricarla para otra cuenta. No identifica al dispositivo ni sirve para
// iniciar sesión: solo evita repetir el aviso en cada ingreso desde el
// mismo navegador.
export const KNOWN_DEVICE_COOKIE = 'known_device';
export const KNOWN_DEVICE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

// El enlace "No fui yo" del correo vive más que el de "Olvidé mi contraseña"
// (1 h): el aviso puede leerse horas después.
const ALERT_RESET_LINK_TTL_MS = 24 * 60 * 60 * 1000;

const WHEN_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

// Aviso por correo cuando alguien inicia sesión desde un navegador en el que
// esa cuenta no había entrado antes, con un enlace para cambiar la contraseña
// (lo que cierra todas las sesiones, ver PasswordResetService.resetPassword).
@Injectable()
export class LoginAlertService {
  private readonly logger = new Logger(LoginAlertService.name);
  private readonly secret: string;

  constructor(
    config: ConfigService,
    private readonly emailService: EmailService,
    private readonly passwordResetService: PasswordResetService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
  }

  isKnownDevice(cookieValue: string | undefined, userId: string): boolean {
    if (!cookieValue) return false;
    const expected = Buffer.from(this.deviceCookieValue(userId));
    const received = Buffer.from(cookieValue);
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  deviceCookieValue(userId: string): string {
    const signature = crypto.createHmac('sha256', this.secret).update(`known-device:${userId}`).digest('base64url');
    return `${userId}.${signature}`;
  }

  // Fire-and-forget: nunca bloquea ni hace fallar el inicio de sesión.
  notifyNewDevice(user: { id: string; email: string; name: string }, ip: string | undefined, userAgent: string | undefined): void {
    this.send(user, ip, userAgent).catch((error: any) => {
      this.logger.warn(`Login alert not sent for user ${user.id}: ${error?.message ?? error}`);
    });
  }

  private async send(user: { id: string; email: string; name: string }, ip: string | undefined, userAgent: string | undefined): Promise<void> {
    const secureLink = await this.passwordResetService.issueResetLink(user.id, ALERT_RESET_LINK_TTL_MS);
    await this.emailService.sendLoginAlertEmail(user.email, {
      name: user.name,
      when: `${WHEN_FORMAT.format(new Date())} (hora de Colombia)`,
      device: describeDevice(userAgent),
      ip: ip ?? 'desconocida',
      secureLink,
    });
  }
}

// "Chrome en Windows", "Safari en iPhone"... sin librerías: alcanza para que
// la persona reconozca (o no) el dispositivo.
export function describeDevice(userAgent: string | undefined): string {
  if (!userAgent) return 'Dispositivo desconocido';
  const ua = userAgent;

  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Chrome\/|CriOS\//.test(ua)
            ? 'Chrome'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Navegador desconocido';

  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'sistema desconocido';

  return `${browser} en ${os}`;
}
