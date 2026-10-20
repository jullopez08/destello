import { BRAND_NAME } from '../brand';

// Código de 6 dígitos para confirmar el correo al inscribirse (SignupService).
export function buildSignupCodeEmailHtml(code: string, minutes: number): string {
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
                <h1 style="margin:0;font-size:20px;color:#3d2417;">Tu código para entrar a ${BRAND_NAME}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px 32px;">
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Escribe este código en la página para terminar de crear la cuenta de tu negocio.
                </p>
                <p style="margin:0 0 16px 0;font-size:32px;letter-spacing:8px;font-weight:700;color:#3d2417;">${code}</p>
                <p style="margin:0 0 0 0;font-size:14px;line-height:1.6;color:#7d5d4a;">
                  Vence en <strong>${minutes} minutos</strong>.
                </p>
                <p style="margin:24px 0 0 0;font-size:12px;line-height:1.6;color:#a08672;">
                  Si no fuiste tú, ignora este correo: sin el código no se crea ninguna cuenta.
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
