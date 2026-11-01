"use client";

import { useEffect, useState } from "react";
import EmergencyView from "@/components/EmergencyView";
import { listCopies, type EmergencySnapshot } from "@/lib/emergency";

export default function OfflineEmergency({ userId }: { userId: string }) {
  const [copies, setCopies] = useState<EmergencySnapshot[]>([]);
  const [view, setView] = useState<EmergencySnapshot | null>(null);

  useEffect(() => {
    if (userId) setCopies(listCopies(userId));
  }, [userId]);

  if (copies.length === 0) return null;

  return (
    <>
      <div className="grid gap-2">
        {copies.map((c) => (
          <button
            key={c.childId}
            type="button"
            onClick={() => setView(c)}
            className="min-h-14 rounded-xl bg-[#b00020] px-5 text-base font-bold text-[#ffffff] hover:bg-[#8e001a]"
          >
            Ver ficha de emergencia de {c.childName}
          </button>
        ))}
      </div>
      {view && <EmergencyView snap={view} source="cache" onClose={() => setView(null)} />}
    </>
  );
}

export function OfflineScreen({ uid }: { uid: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-5">
      <div className="grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center">
        <h1 className="text-xl font-semibold">Sin conexión</h1>
        <p className="text-sm text-[var(--muted)]">
          No pudimos verificar tu sesión sin internet. Puedes abrir la ficha de emergencia guardada en
          este dispositivo.
        </p>
        <OfflineEmergency userId={uid} />
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}