"use client";

import { useState } from "react";
import { useChild } from "@/components/ChildGate";
import Choice from "@/components/Choice";
import { clearCopies, copyEnabled, listCopies, setCopyPref } from "@/lib/emergency";

export default function EmergencyDeviceSettings() {
  const { userId, role } = useChild();
  const [on, setOn] = useState(() => copyEnabled(userId, role));
  const [copies, setCopies] = useState(() => listCopies(userId));

  const change = (v: "si" | "no") => {
    const enable = v === "si";
    setCopyPref(userId, enable);
    setOn(enable);
    if (!enable) clearCopies(userId);
    else window.dispatchEvent(new Event("pap:emergency-sync"));
    // se espera un instante a que se guarde la copia
    setTimeout(() => setCopies(listCopies(userId)), 150);
  };

  const wipe = () => {
    clearCopies(userId);
    setCopies([]);
  };

  return (
    <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Ficha de emergencia sin conexión</h2>

      <Choice<"si" | "no">
        legend="Copia en este dispositivo"
        hint="Permite abrir la ficha aunque no haya internet. Solo guarda lo que tu rol ya puede ver."
        value={on ? "si" : "no"}
        options={[
          { value: "si", label: "Guardar copia" },
          { value: "no", label: "No guardar" },
        ]}
        onChange={change}
      />

      <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        La copia no está cifrada: quien use este dispositivo desbloqueado podría leerla. Se borra al
        cerrar sesión. Si pierdes el dispositivo, cierra sesión desde otro.
      </p>

      {copies.length > 0 ? (
        <>
          <ul className="grid gap-1 text-sm text-[var(--muted)]">
            {copies.map((c) => (
              <li key={c.childId}>
                Copia de {c.childName}: guardada el{" "}
                {new Date(c.savedAt).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </li>
            ))}
          </ul>
          <div>
            <button
              type="button"
              onClick={wipe}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Borrar copias de este dispositivo
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--muted)]">No hay copias guardadas en este dispositivo.</p>
      )}
    </section>
  );
}