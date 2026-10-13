import { ForbiddenException } from '@nestjs/common';
import { isSuperAdmin } from './is-super-admin.util';
import type { CurrentUserData } from '../decorators/current-user.decorator';

// Shared cross-tenant guard for single-record GET/mutate routes whose model
// carries organizationId directly (Appointment, Service, DoctorAvailability,
// DoctorBlock) — same SUPER_ADMIN-bypass rule as everywhere else (see
// isSuperAdmin), everyone else must belong to the same organization as the record
// they're trying to reach.
export function assertSameOrganization(recordOrganizationId: string | null, currentUser: CurrentUserData, message: string) {
  if (isSuperAdmin(currentUser)) {
    return;
  }

  if (recordOrganizationId !== currentUser.organizationId) {
    throw new ForbiddenException(message);
  }
}
