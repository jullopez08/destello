import { PasswordResetService, resetTokenHash } from './password-reset.service';

// Un User en memoria: basta para ver qué se guarda y qué se busca.
function setup() {
  const user: Record<string, unknown> = { id: 'u1', email: 'a@b.co', active: true, passwordResetToken: null, passwordResetTokenExpiresAt: null };
  const prisma = {
    user: {
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(user, data)),
      findUnique: jest.fn(async ({ where }: { where: { passwordResetToken?: string } }) =>
        where.passwordResetToken && where.passwordResetToken === user.passwordResetToken ? user : null),
    },
  };
  const config = { get: () => 'https://panel.test' };
  const service = new PasswordResetService(prisma as never, {} as never, config as never);
  return { user, service };
}

describe('enlace para cambiar la contraseña', () => {
  it('en la base queda la huella del enlace, no el enlace', async () => {
    const { user, service } = setup();
    const link = await service.issueResetLink('u1', 60_000);
    const token = link.split('/').pop()!;
    expect(user.passwordResetToken).toBe(resetTokenHash(token));
    expect(user.passwordResetToken).not.toBe(token);
  });

  it('el enlace verdadero sirve una vez; la huella copiada de la base no sirve como enlace', async () => {
    const { user, service } = setup();
    const token = (await service.issueResetLink('u1', 60_000)).split('/').pop()!;
    const stored = user.passwordResetToken as string;
    await expect(service.resetPassword(stored, 'clave-nueva-1')).rejects.toThrow(/ya no es válido/);
    await expect(service.resetPassword(token, 'clave-nueva-1')).resolves.toBeUndefined();
    await expect(service.resetPassword(token, 'clave-nueva-2')).rejects.toThrow(/ya no es válido/);
  });
});
