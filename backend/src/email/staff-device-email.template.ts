import { BRAND_NAME } from '../brand';

export interface StaffDeviceNoticeDetails {
  staffName: string;
  device: string;
}

// Aviso a la dueña cuando alguien de su equipo conecta un aparato nuevo con su enlace y su PIN
// (StaffAuthService.claim). Si no lo reconoce, lo desconecta y cambia el enlace en Tu equipo.
export function buildStaffDeviceEmailHtml(details: StaffDeviceNoticeDetails): string {
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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Aparato nuevo en tu equipo</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  <strong>${escapeHtml(details.staffName)}</strong> entró a ${BRAND_NAME} desde <strong>${escapeHtml(details.device)}</strong>.
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  ¿No lo reconoces? En Configuración → Tu equipo, desconecta ese aparato y cambia el enlace.
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
