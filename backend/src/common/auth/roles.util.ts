import { Role } from '@prisma/client';

// Single point of truth for checking a user's roles from now on — never
// compare `.roles` directly. Accepts anything with a `roles: Role[]` field,
// so it works the same for CurrentUserData (JWT-derived) and raw Prisma
// User records (e.g. a `prisma.user.findUnique` result).
export function hasRole(user: { roles: Role[] } | null | undefined, role: Role): boolean {
  return !!user?.roles.includes(role);
}

// "Does the user have AT LEAST ONE of these roles" — what RolesGuard needs,
// since @Roles(...) declares a set of roles any one of which is sufficient.
export function hasAnyRole(user: { roles: Role[] } | null | undefined, roles: Role[]): boolean {
  return !!user?.roles.some((r) => roles.includes(r));
}
