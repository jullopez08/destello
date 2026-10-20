import type { Metadata } from "next"
import { ClaimDevice } from "@/components/staff/staff-app"

export const metadata: Metadata = {
  title: "Conectar aparato · Destello",
  robots: { index: false, follow: false },
}

// Enlace que la dueña le manda a un mesero o a la tablet de cocina. En Next 16 `params` es una promesa.
export default async function ClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ClaimDevice token={token} />
}
