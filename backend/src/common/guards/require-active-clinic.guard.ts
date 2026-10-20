import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSuperAdmin } from '../auth/is-super-admin.util';
import type { CurrentUserData } from '../decorators/current-user.decorator';

// Blocks DOCTOR/MEMBER access to a route once their organization has been
// deactivated (Organization.active: false) — either immediately via the manual
// SubscriptionControlsService.updateStatus path, or after the grace period expires
// via SubscriptionBillingCron.blockOrganizationsWithExpiredGracePeriod. Must run
// after JwtAuthGuard so request.user is populated. Never apply this to
// auth endpoints, GET /subscriptions/me, or the subscription management
// routes themselves — those must stay reachable while blocked.
@Injectable()
export class RequireActiveOrganizationGuard implements CanActivate {

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest() as { user: CurrentUserData };

    // SUPER_ADMIN has no organizationId and is never restricted by this guard.
    if (!user?.organizationId || isSuperAdmin(user)) {
      return true;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { active: true, approvalPending: true },
    });

    // Inscrita sola con SIGNUP_MODE=review: espera la aprobación del super admin.
    if (organization?.approvalPending) {
      throw new ForbiddenException({ statusCode: 403, error: 'approval_pending', message: 'Tu negocio está en revisión. Te avisamos cuando esté listo.' });
    }

    if (organization && !organization.active) {
      throw new ForbiddenException(
        "Your organization's access is suspended. Go to the Subscription tab to update your payment.",
      );
    }

    return true;
  }
}
