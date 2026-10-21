import { BRAND_NAME } from '../brand';

// Aviso a la dueña cuando el super admin aprueba su negocio (inscripción en modo `review`): hasta ahora veía
// "Estamos revisando tu negocio" y no sabía cuándo volver (Julieth, 2026-10-20).
export function buildApprovedEmailHtml(businessName: string, link: string): string {
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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">¡Tu negocio ya está listo!</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px 32px;">
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Revisamos <strong>${escapeHtml(businessName)}</strong> y ya puedes usar ${BRAND_NAME}. Entra con tu correo y tu contraseña.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#ffd23f;">
                      <a href="${link}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#3d2417;text-decoration:none;">
                        Entrar a mi cocina
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
