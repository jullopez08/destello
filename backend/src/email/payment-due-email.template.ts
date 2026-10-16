import { BRAND_NAME, LEGAL_EMAIL } from '../brand';
// Mismo estilo que data-deletion-email.template.ts: solo arma el HTML. Aviso del
// día de gracia (SubscriptionBillingCron): el plan venció sin pago y mañana el
// panel queda en pausa. El nombre de la organización lo escribe el cliente: se escapa.
export interface PaymentDueNoticeDetails {
  organizationName: string;
  /// true si lo que terminó fue la prueba gratuita (aún no hay ningún pago).
  trialEnded: boolean;
  /// Página de ingreso al panel: al entrar se abre Suscripción con el botón de pago.
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

export function buildPaymentDueEmailSubject(details: PaymentDueNoticeDetails): string {
  return details.trialEnded
    ? `Tu prueba gratis de ${BRAND_NAME} terminó: activa tu plan`
    : `Tu acceso mensual a ${BRAND_NAME} está a punto de vencer: actualiza tu pago`;
}

export function buildPaymentDueEmailHtml(details: PaymentDueNoticeDetails): string {
  const organizationName = escapeHtml(details.organizationName);
  const intro = details.trialEnded
    ? `La prueba gratis de <strong>${organizationName}</strong> en ${BRAND_NAME} terminó.`
    : `El acceso mensual de <strong>${organizationName}</strong> a ${BRAND_NAME} venció y todavía no recibimos el pago.`;

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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Tu acceso está a punto de vencer</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  ${intro} Tienes <strong>un día</strong> para pagar; después tu panel queda en pausa hasta que pagues.
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Tus pedidos, recetas e insumos siguen guardados. Puedes pagar con tarjeta, PSE, Nequi o Bancolombia.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#ffd23f;">
                      <a href="${details.accessLink}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#3d2417;text-decoration:none;">
                        Actualizar mi pago
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a08672;">
                  Si ya pagaste, no tienes que hacer nada. Si tienes dudas, escríbenos a ${LEGAL_EMAIL}.
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
