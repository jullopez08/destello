import { BadRequestException } from '@nestjs/common';
import type { CurrentUserData } from '../decorators/current-user.decorator';

// Single place that resolves "which organization is this read scoped to," shared
// by every list endpoint whose model has no organization-scoped record to check
// ownership against (GET /patients, /appointment, /doctor-availability,
// /doctor-block). A organization-scoped user (DOCTOR/MEMBER/ADMIN) is always
// pinned to their own session organizationId — explicitOrganizationId is ignored for
// them, so one organization's staff can never read another's data by passing a
// different id. SUPER_ADMIN has no organizationId of their own, so they must opt
// into exactly one organization via explicitOrganizationId or get rejected — silently
// returning every organization's rows mixed together was the actual leak this closes.
export function requireOrganizationId(
  currentUser: CurrentUserData,
  message: string,
  explicitOrganizationId?: string,
): string {
  if (currentUser.organizationId) {
    return currentUser.organizationId;
  }

  if (explicitOrganizationId) {
    return explicitOrganizationId;
  }

  throw new BadRequestException(message);
}
