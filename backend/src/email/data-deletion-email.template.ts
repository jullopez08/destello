import { BRAND_NAME, LEGAL_EMAIL } from '../brand';
// Mismo estilo que login-alert-email.template.ts: solo arma el HTML. Aviso de
// que los datos de una organización inactiva se van a borrar (DataRetentionCron).
// El nombre de la organización lo escribe el cliente: se escapa.
export interface DataDeletionNoticeDetails {
  organizationName: string;
  /// p. ej. "martes 6 de abril de 2027"
  deletionDate: string;
  /// true en los recordatorios (un mes y una semana antes), false en el primero.
  reminder: boolean;
  /// Página de ingreso al panel, donde se paga para reactivar la cuenta.
  accessLink: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildDataDeletionEmailSubject(
  details: DataDeletionNoticeDetails,
): string {
  return details.reminder
    ? `Recordatorio: los datos de ${details.organizationName} en ${BRAND_NAME} se borrarán el ${details.deletionDate}`
    : `Los datos de ${details.organizationName} en ${BRAND_NAME} se borrarán el ${details.deletionDate}`;
}

export function buildDataDeletionEmailHtml(
  details: DataDeletionNoticeDetails,
): string {
  const organizationName = escapeHtml(details.organizationName);
  const deletionDate = escapeHtml(details.deletionDate);
  const intro = details.reminder
    ? `Te recordamos que la cuenta de <strong>${organizationName}</strong> sigue inactiva.`
    : `La cuenta de <strong>${organizationName}</strong> en ${BRAND_NAME} quedó inactiva (la suscripción se canceló o venció sin pago).`;

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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Tus datos se borrarán el ${deletionDate}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  ${intro} Guardamos toda tu información durante 6 meses por si decides volver.
                </p>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  El <strong>${deletionDate}</strong> borraremos de forma definitiva todo lo que hay en tu cuenta,
                  incluidos usuarios y pagos. Después de esa fecha no se podrá recuperar.
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  <strong>Si quieres seguir con nosotros</strong>, ingresa y paga tu suscripción antes de esa fecha:
                  todo quedará tal como lo dejaste.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#ffd23f;">
                      <a href="${details.accessLink}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#3d2417;text-decoration:none;">
                        Reactivar mi cuenta
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a08672;">
                  Si quieres una copia de tus datos o que los borremos antes, escríbenos a ${LEGAL_EMAIL}.
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
