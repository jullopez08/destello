import { BRAND_NAME } from '../brand';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { buildPasswordResetEmailHtml } from './password-reset-email.template';
import { buildLoginAlertEmailHtml, LoginAlertDetails } from './login-alert-email.template';
import {
  buildDataDeletionEmailHtml,
  buildDataDeletionEmailSubject,
  DataDeletionNoticeDetails,
} from './data-deletion-email.template';

const DEFAULT_FROM = `${BRAND_NAME} <noreply@aggendarme.com>`;

// Thin wrapper around the Resend client — same reasoning as
// WhatsappApiClient: kept as its own injectable so callers (and tests) never
// touch the Resend SDK directly, and so a future second email (e.g. a
// welcome email) only adds a method here, not a new client setup.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    // Sin llave (desarrollo local) los correos no salen: se anotan en el log,
    // con el link incluido fuera de producción para poder probar los flujos.
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('RESEND_FROM_EMAIL') || DEFAULT_FROM;
    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY is not set: emails will be logged instead of sent.');
    }
  }

  private async send(payload: { from: string; to: string | string[]; subject: string; html: string }) {
    if (!this.resend) {
      const links = process.env.NODE_ENV === 'production' ? '' : ` links=${(payload.html.match(/href="([^"]+)"/g) ?? []).join(' ')}`;
      this.logger.warn(`[email not sent] to=${String(payload.to)} subject="${payload.subject}"${links}`);
      return { data: { id: 'not-sent' }, error: null };
    }
    return this.resend.emails.send(payload);
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const { data, error } = await this.send({
      from: this.from,
      to,
      subject: `Restablece tu contraseña de ${BRAND_NAME}`,
      html: buildPasswordResetEmailHtml(resetLink),
    });

    if (error) {
      // Fire-and-forget from the caller's side (see
      // PasswordResetService.forgotPassword) — logged here instead of
      // thrown so a Resend outage never turns into a stack trace surfaced to
      // an anonymous caller, or a hint that the email address was valid.
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      return;
    }

    // Resend's own message id — the confirmation that the API accepted the
    // send, useful for correlating a support report ("I never got the
    // email") against what actually happened on our side.
    this.logger.log(`Password reset email accepted by Resend (id=${data?.id})`);
  }

  // Aviso de inicio de sesión desde un dispositivo nuevo (LoginAlertService).
  async sendLoginAlertEmail(to: string, details: LoginAlertDetails): Promise<void> {
    const { data, error } = await this.send({
      from: this.from,
      to,
      subject: `Nuevo inicio de sesión en tu cuenta de ${BRAND_NAME}`,
      html: buildLoginAlertEmailHtml(details),
    });

    if (error) {
      this.logger.error(`Failed to send login alert email: ${error.message}`);
      return;
    }

    this.logger.log(`Login alert email accepted by Resend (id=${data?.id})`);
  }

  // Aviso de borrado de los datos de una organización inactiva (DataRetentionCron).
  // Devuelve si Resend lo aceptó, para no marcar como enviado un aviso que falló.
  async sendDataDeletionNotice(to: string[], details: DataDeletionNoticeDetails): Promise<boolean> {
    const { data, error } = await this.send({
      from: this.from,
      to,
      subject: buildDataDeletionEmailSubject(details),
      html: buildDataDeletionEmailHtml(details),
    });

    if (error) {
      this.logger.error(`Failed to send data deletion notice: ${error.message}`);
      return false;
    }

    this.logger.log(`Data deletion notice accepted by Resend (id=${data?.id})`);
    return true;
  }
}
