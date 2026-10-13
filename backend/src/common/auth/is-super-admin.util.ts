import { Role } from '@prisma/client';
import { hasRole } from './roles.util';

// The only place in the project that should ever check for SUPER_ADMIN.
// Everything else (guards, services) must import and call this instead of
// rewriting the check, so the bypass rule lives in exactly one place.
export function isSuperAdmin(user: { roles: Role[] } | undefined): boolean {
  return hasRole(user, Role.SUPER_ADMIN);
}
