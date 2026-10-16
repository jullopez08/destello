import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

// Correo del día de gracia: lo manda SubscriptionBillingCron al marcar una
// suscripción como vencida (PAST_DUE). Va a las dueñas (ADMIN) activas y al
// contacto de facturación. Si falla, solo se anota: el cobro sigue igual.
@Injectable()
export class PaymentDueNotice {
  private readonly logger = new Logger(PaymentDueNotice.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async send(organizationId: string, trialEnded: boolean): Promise<boolean> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          name: true,
          users: { where: { active: true, roles: { has: Role.ADMIN } }, select: { email: true } },
          subscription: { select: { billingContact: { select: { email: true, active: true } } } },
        },
      });
      if (!organization) return false;

      const emails = new Set(organization.users.map((user) => user.email));
      const contact = organization.subscription?.billingContact;
      if (contact?.active) emails.add(contact.email);
      if (!emails.size) return false;

      return await this.email.sendPaymentDueNotice([...emails], {
        organizationName: organization.name,
        trialEnded,
        accessLink: `${this.frontendUrl()}/access#suscripcion`,
      });
    } catch (error) {
      this.logger.error(`Failed to send payment due notice to organization ${organizationId}`, error instanceof Error ? error.stack : error);
      return false;
    }
  }

  // FRONTEND_URL puede traer varias URLs separadas por coma (ver main.ts).
  private frontendUrl() {
    const first = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').split(',')[0];
    return first.trim().replace(/\/$/, '');
  }
}
