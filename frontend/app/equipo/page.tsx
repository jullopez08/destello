import type { Metadata } from "next"
import { StaffApp } from "@/components/staff/staff-app"

export const metadata: Metadata = {
  title: "Equipo · Destello",
  robots: { index: false, follow: false },
}

// Meseros y pantalla de cocina (su aparato ya quedó amarrado con su enlace).
export default function StaffPage() {
  return <StaffApp />
}
