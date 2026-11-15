"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Si llegas aquí, la invitación ya se atendió: vuelves al inicio
export default function Unirse() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return <p className="text-sm text-[var(--muted)]">Preparando tu invitación…</p>;
}