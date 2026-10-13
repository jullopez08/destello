import { BRAND_NAME, LEGAL_EMAIL } from '../brand';
// Mismo estilo que password-reset-email.template.ts: solo arma el HTML.
// Todos los textos variables se escapan: el navegador (user-agent) lo manda
// quien inicia sesión y no se debe confiar en él.
export interface LoginAlertDetails {
  name: string;
  /// p. ej. "jueves 1 de octubre de 2026, 3:15 p. m. (hora de Colombia)"
  when: string;
  /// p. ej. "Chrome en Windows"
  device: string;
  ip: string;
  /// Link de un solo uso para cambiar la contraseña (y cerrar todas las sesiones).
  secureLink: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildLoginAlertEmailHtml(details: LoginAlertDetails): string {
  const name = escapeHtml(details.name);
  const when = escapeHtml(details.when);
  const device = escapeHtml(details.device);
  const ip = escapeHtml(details.ip);

  return `
<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#fff7e6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7e6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Nuevo inicio de sesión en tu cuenta</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Hola ${name}, alguien acaba de ingresar a tu espacio de trabajo en ${BRAND_NAME} desde un dispositivo nuevo:
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px 0;font-size:14px;color:#3d2417;background-color:#fff7e6;border-radius:8px;">
                  <tr><td style="padding:12px 16px 4px 16px;"><strong>Fecha:</strong> ${when}</td></tr>
                  <tr><td style="padding:4px 16px;"><strong>Dispositivo:</strong> ${device}</td></tr>
                  <tr><td style="padding:4px 16px 12px 16px;"><strong>Dirección IP:</strong> ${ip}</td></tr>
                </table>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  <strong>Si fuiste tú</strong>, no tienes que hacer nada.
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  <strong>Si no fuiste tú</strong>, cambia tu contraseña ahora: al hacerlo se cerrarán todas las sesiones
                  abiertas, incluida la de esa persona.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#ffd23f;">
                      <a href="${details.secureLink}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#3d2417;text-decoration:none;">
                        No fui yo: cambiar mi contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a08672;">
                  Este enlace es válido por 24 horas. Si tienes dudas, escríbenos a ${LEGAL_EMAIL}.
                  Este es un correo automático, por favor no lo respondas.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}
