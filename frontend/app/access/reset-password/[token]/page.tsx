import type { Metadata } from "next"
import { ResetPasswordForm } from "@/components/access/reset-password-form"

export const metadata: Metadata = {
  title: "Nueva contraseña · Destello",
  robots: { index: false, follow: false },
}

// Link del correo "Restablece tu contraseña" (y del botón "No fui yo" del
// aviso de inicio de sesión). En Next 16 `params` es una promesa.
export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ResetPasswordForm token={token} />
}
