import { BRAND_NAME } from '../brand';
// Plain string builder, not a service — same split as
// whatsapp-webhook.util.ts's message builders, kept separate from
// EmailService so the markup itself has no Resend/NestJS concerns mixed in.
export function buildPasswordResetEmailHtml(resetLink: string): string {
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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Restablece tu contraseña</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta en ${BRAND_NAME}.
                  Haz clic en el siguiente botón para elegir una nueva.
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Este enlace es válido por <strong>1 hora</strong>.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#ffd23f;">
                      <a href="${resetLink}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#3d2417;text-decoration:none;">
                        Restablecer contraseña
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a08672;">
                  Si tú no solicitaste este cambio, puedes ignorar este correo — tu contraseña seguirá siendo la misma.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim()
}
