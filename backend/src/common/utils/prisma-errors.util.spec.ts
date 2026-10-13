import { ConflictException } from '@nestjs/common';
import { handleForeignKeyConstraint, handleUniqueConstraint } from './prisma-errors.util';

describe('handleForeignKeyConstraint', () => {
  it('converts a known P2003 error into a ConflictException', async () => {
    const error: any = new Error('Foreign key constraint violated');
    error.code = 'P2003';

    await expect(
      handleForeignKeyConstraint(() => Promise.reject(error), 'tiene citas asociadas'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('converts a known P2014 error into a ConflictException', async () => {
    const error: any = new Error('The change you are trying to make would violate the relation');
    error.code = 'P2014';

    await expect(
      handleForeignKeyConstraint(() => Promise.reject(error), 'tiene citas asociadas'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // Confirmed against a real Railway deployment: the same Postgres RESTRICT
  // violation (SQLSTATE 23001) that Prisma classifies as P2003 locally can
  // arrive there as a PrismaClientUnknownRequestError with no .code at all —
  // same Prisma/engine version, different environment. This is the fallback
  // that still catches it via the raw Postgres message.
  it('converts an uncoded PrismaClientUnknownRequestError mentioning the RESTRICT violation into a ConflictException', async () => {
    const error: any = new Error(
      'Invalid `prisma.patient.delete()` invocation:\n' +
        'PostgresError { code: "23001", message: "update or delete on table \\"Patient\\" violates RESTRICT setting of foreign key constraint \\"Appointment_patientId_fkey\\" on table \\"Appointment\\"" }',
    );
    error.code = undefined;

    await expect(
      handleForeignKeyConstraint(() => Promise.reject(error), 'tiene citas asociadas'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('re-throws an unrelated error untouched', async () => {
    const error = new Error('Connection refused');

    await expect(handleForeignKeyConstraint(() => Promise.reject(error), 'tiene citas asociadas')).rejects.toBe(
      error,
    );
  });

  it('resolves normally when the operation succeeds', async () => {
    await expect(handleForeignKeyConstraint(() => Promise.resolve('ok'), 'tiene citas asociadas')).resolves.toBe(
      'ok',
    );
  });
});

describe('handleUniqueConstraint', () => {
  it('converts a known P2002 error into a ConflictException', async () => {
    const error: any = new Error('Unique constraint failed');
    error.code = 'P2002';

    await expect(handleUniqueConstraint(() => Promise.reject(error), 'ya existe')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('re-throws an unrelated error untouched', async () => {
    const error = new Error('Connection refused');

    await expect(handleUniqueConstraint(() => Promise.reject(error), 'ya existe')).rejects.toBe(error);
  });
});
