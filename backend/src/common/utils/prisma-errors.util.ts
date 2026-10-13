import { ConflictException } from '@nestjs/common';

// Shared shape for "run this Prisma write, and if it violates a unique
// constraint (P2002), translate that into a clear ConflictException instead
// of a raw Prisma error" — the exact pattern that was previously copy-pasted
// across OrganizationsService, DoctorService, PatientsService, and UsersService.
export async function handleUniqueConstraint<T>(
  operation: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw error;
  }
}

// A Postgres ON DELETE RESTRICT violation (SQLSTATE 23001) isn't always
// surfaced by Prisma as a PrismaClientKnownRequestError with .code ===
// 'P2003' — confirmed to sometimes arrive as a PrismaClientUnknownRequestError
// with no .code at all instead, same Prisma/engine version, different
// environment. .code is the primary, reliable signal; this regex is the
// fallback for whatever slips past it, matched against the raw Postgres
// message Prisma still embeds either way.
const RESTRICT_VIOLATION_PATTERN = /\b23001\b|violates restrict setting of foreign key/i;

// Same idea, for the delete side: a P2003 (or, under Prisma's emulated
// relationMode, P2014) foreign key violation means this row is still
// referenced elsewhere — translate that into a clear ConflictException
// instead of the ORM's raw error surfacing as an unhandled 500.
export async function handleForeignKeyConstraint<T>(
  operation: () => Promise<T>,
  message: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (error.code === 'P2003' || error.code === 'P2014') {
      throw new ConflictException(message);
    }
    if (typeof error?.message === 'string' && RESTRICT_VIOLATION_PATTERN.test(error.message)) {
      throw new ConflictException(message);
    }
    throw error;
  }
}
