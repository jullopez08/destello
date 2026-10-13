import { describeDevice, LoginAlertService } from './login-alert.service';
import { PasswordResetService } from './password-reset.service';
import { buildLoginAlertEmailHtml } from '../email/login-alert-email.template';

function build() {
  const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
  const emailService = { sendLoginAlertEmail: jest.fn().mockResolvedValue(undefined) };
  const passwordResetService = { issueResetLink: jest.fn().mockResolvedValue('https://x/access/reset-password/tok') };
  const service = new LoginAlertService(config as any, emailService as any, passwordResetService as any);
  return { service, emailService, passwordResetService };
}

const USER = { id: 'user-1', email: 'ana@organizationa.co', name: 'Ana' };

describe('LoginAlertService', () => {
  it('reconoce el navegador solo con la cookie firmada de ESA cuenta', () => {
    const { service } = build();
    const cookie = service.deviceCookieValue('user-1');

    expect(service.isKnownDevice(cookie, 'user-1')).toBe(true);
    expect(service.isKnownDevice(cookie, 'user-2')).toBe(false);
    expect(service.isKnownDevice('user-1.firma-inventada', 'user-1')).toBe(false);
    expect(service.isKnownDevice(undefined, 'user-1')).toBe(false);
  });

  it('envía el aviso con un enlace de 24 h para cambiar la contraseña', async () => {
    const { service, emailService, passwordResetService } = build();

    service.notifyNewDevice(USER, '181.50.1.2', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36');
    await new Promise((resolve) => setImmediate(resolve));

    expect(passwordResetService.issueResetLink).toHaveBeenCalledWith('user-1', 24 * 60 * 60 * 1000);
    expect(emailService.sendLoginAlertEmail).toHaveBeenCalledWith(
      'ana@organizationa.co',
      expect.objectContaining({ name: 'Ana', ip: '181.50.1.2', device: 'Chrome en Windows', secureLink: 'https://x/access/reset-password/tok' }),
    );
  });

  it('si el correo falla, no lanza (el inicio de sesión sigue)', async () => {
    const { service, emailService } = build();
    emailService.sendLoginAlertEmail.mockRejectedValue(new Error('resend down'));

    expect(() => service.notifyNewDevice(USER, undefined, undefined)).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});

describe('describeDevice', () => {
  it('nombra el navegador y el sistema', () => {
    expect(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1')).toBe('Safari en iPhone');
    expect(describeDevice('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe('Chrome en Android');
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0')).toBe('Edge en Windows');
    expect(describeDevice(undefined)).toBe('Dispositivo desconocido');
  });
});

describe('buildLoginAlertEmailHtml', () => {
  it('escapa los textos que vienen del navegador', () => {
    const html = buildLoginAlertEmailHtml({ name: 'Ana', when: 'hoy', device: '<script>x</script>', ip: '1.2.3.4', secureLink: 'https://x' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('PasswordResetService.resetPassword', () => {
  it('cambiar la contraseña cierra todas las sesiones abiertas', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new PasswordResetService(prisma as any, {} as any, { get: jest.fn() } as any);

    await service.resetPassword('tok', 'NuevaClave123');

    expect(prisma.user.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ passwordResetToken: null, sessionsInvalidatedAt: expect.any(Date) }),
    );
  });
});
