import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { purgeOrganizationData } from './purge-organization-data';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const RETENTION_MONTHS = 6;

// Avisos por correo antes del borrado (Organization.dataDeletionNoticesSent).
const NOTICE_SCHEDULED = 1;
const NOTICE_ONE_MONTH = 2;
const NOTICE_ONE_WEEK = 3;

// Qué aviso le corresponde a una organización según los días que faltan.
export function noticeStageFor(daysLeft: number): number {
  if (daysLeft <= 7) return NOTICE_ONE_WEEK;
  if (daysLeft <= 30) return NOTICE_ONE_MONTH;
  return NOTICE_SCHEDULED;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// "martes 6 de abril de 2027" (en la zona horaria del proceso, ver timezone.ts).
export function formatDeletionDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .replace(',', '');
}

// Guarda los datos de una organización inactiva durante 6 meses por si vuelve,
// y después los borra todos (purgeOrganizationData). No depende de dónde se
// desactivó (cron de facturación, super admin, cambio de estado): cada día
// mira Organization.active y programa o cancela el borrado. Si se reactiva
// (por ejemplo, con un pago aprobado de Wompi) antes de la fecha, el borrado
// se cancela y la próxima vez que quede inactiva empieza de cero.
@Injectable()
export class DataRetentionCron {
  private readonly logger = new Logger(DataRetentionCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // 7 a. m.: después del cron de facturación (6 a. m.), que es el que bloquea.
  @Cron('0 7 * * *')
  async run() {
    await this.cancelForReactivatedOrganizations();
    await this.scheduleInactiveOrganizations();
    await this.sendDueNotices();
    await this.purgeDueOrganizations();
  }

  async cancelForReactivatedOrganizations() {
    const result = await this.prisma.organization.updateMany({
      where: { active: true, dataDeletionScheduledAt: { not: null } },
      data: { dataDeletionScheduledAt: null, dataDeletionNoticesSent: 0 },
    });
    if (result.count > 0) {
      this.logger.log(
        `Cancelled data deletion for ${result.count} reactivated organization(s).`,
      );
    }
    return result.count;
  }

  async scheduleInactiveOrganizations(now: Date = new Date()) {
    const result = await this.prisma.organization.updateMany({
      where: { active: false, dataDeletionScheduledAt: null },
      data: {
        dataDeletionScheduledAt: addMonths(now, RETENTION_MONTHS),
        dataDeletionNoticesSent: 0,
      },
    });
    if (result.count > 0) {
      this.logger.log(
        `Scheduled data deletion in ${RETENTION_MONTHS} months for ${result.count} inactive organization(s).`,
      );
    }
    return result.count;
  }

  // Un aviso por organización y por día como máximo: el que le toca según los
  // días que faltan, si todavía no se le ha enviado. Si Resend falla, no se
  // marca y se reintenta al día siguiente.
  async sendDueNotices(now: Date = new Date()) {
    const organizations = await this.prisma.organization.findMany({
      where: { active: false, dataDeletionScheduledAt: { gt: now } },
      select: {
        id: true,
        name: true,
        dataDeletionScheduledAt: true,
        dataDeletionNoticesSent: true,
        subscription: {
          select: { billingContact: { select: { email: true, active: true } } },
        },
      },
    });

    let sent = 0;
    for (const organization of organizations) {
      const scheduledAt = organization.dataDeletionScheduledAt!;
      const daysLeft = Math.ceil(
        (scheduledAt.getTime() - now.getTime()) / MS_PER_DAY,
      );
      const stage = noticeStageFor(daysLeft);
      if (stage <= organization.dataDeletionNoticesSent) continue;

      const recipients = await this.recipientsFor(
        organization.id,
        organization.subscription?.billingContact ?? null,
      );
      if (recipients.length === 0) {
        this.logger.warn(
          `Organization ${organization.id} is scheduled for data deletion but has no active user to notify.`,
        );
        continue;
      }

      const accepted = await this.email.sendDataDeletionNotice(recipients, {
        organizationName: organization.name,
        deletionDate: formatDeletionDate(scheduledAt),
        reminder: stage !== NOTICE_SCHEDULED,
        accessLink: `${this.frontendUrl()}/access`,
      });
      if (!accepted) continue;

      await this.prisma.organization.update({
        where: { id: organization.id },
        data: { dataDeletionNoticesSent: stage },
      });
      sent++;
    }
    return sent;
  }

  async purgeDueOrganizations(now: Date = new Date()) {
    const due = await this.prisma.organization.findMany({
      where: { active: false, dataDeletionScheduledAt: { lte: now } },
      select: { id: true },
    });

    let purged = 0;
    for (const organization of due) {
      // Si el dominio conecta integraciones de terceros (p. ej. WhatsApp), darlas
      // de baja aquí, antes de borrar: el token se va con los datos.
      try {
        await this.prisma.$transaction((tx) =>
          purgeOrganizationData(tx, organization.id),
        );
        purged++;
        this.logger.log(
          `Deleted all data of organization ${organization.id} (${RETENTION_MONTHS} months inactive).`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to delete data of organization ${organization.id}`,
          error instanceof Error ? error.stack : error,
        );
      }
    }
    return purged;
  }

  // Las dueñas (ADMIN) de la empresa y el contacto de facturación.
  private async recipientsFor(
    organizationId: string,
    billingContact: { email: string; active: boolean } | null,
  ) {
    const admins = await this.prisma.user.findMany({
      where: { organizationId, active: true, roles: { has: Role.ADMIN } },
      select: { email: true },
    });
    const emails = new Set(admins.map((user) => user.email));
    if (billingContact?.active) emails.add(billingContact.email);
    return [...emails];
  }

  // FRONTEND_URL puede traer varias URLs separadas por coma (ver main.ts).
  private frontendUrl() {
    const first = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).split(',')[0];
    return first.trim().replace(/\/$/, '');
  }
}
