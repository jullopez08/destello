import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

describe('UsersService — changeOwnPassword', () => {
  it('cambiar la contraseña desde Configuración cierra todas las sesiones (el controlador abre una nueva para quien la cambió)', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', password: await bcrypt.hash('actual123', 4) }),
        update: jest.fn().mockResolvedValue({ id: 'user-1', password: 'x' }),
      },
    };
    const service = new UsersService(prisma as any);

    await service.changeOwnPassword('user-1', 'actual123', 'nueva12345');

    expect(prisma.user.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ sessionsInvalidatedAt: expect.any(Date) }),
    );
  });
});
