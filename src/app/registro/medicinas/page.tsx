"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import MedScheduleCard from "@/components/meds/MedScheduleCard";
import DoseHistory from "@/components/meds/DoseHistory";
import { childColor, initials } from "@/lib/childColor";
import { MED_COLS, type Med } from "@/lib/meds";

export default function Medicinas() {
  const { child, role } = useChild();
  const { access } = useChildProfile();
  const isFamily = role === "familia";
  const color = childColor(child.id, child.accent);

  const [meds, setMeds] = useState<Med[]>([]);
  const [overrides, setOverrides] = useState<{ role: string; allowed: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!access.medications) {
      setLoading(false);
      return;
    }
    const m = await supabase
      .from("child_medications")
      .select(MED_COLS)
      .eq("child_id", child.id)
      .order("created_at");
    if (m.error) {
      setError("No se pudieron cargar las medicinas.");
      setLoading(false);
      return;
    }
    setMeds(m.data as Med[]);

    if (isFamily) {
      const o = await supabase
        .from("child_section_access")
        .select("role,allowed")
        .eq("child_id", child.id)
        .eq("section", "medications");
      if (!o.error) setOverrides(o.data as { role: string; allowed: boolean }[]);
    }
    setError("");
    setLoading(false);
  }, [child.id, access.medications, isFamily]);

  useEffect(() => {
    load();
  }, [load]);

  const active = meds.filter((m) => m.active);
  const suspended = meds.length - active.length;

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold"
          style={{ background: color.bg, color: color.fg }}
        >
          {initials(child.name)}
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medicinas de {child.name}</h1>
          <p className="mt-1 text-[var(--muted)]">Horarios, permisos de registro e historial.</p>
        </div>
      </div>

      {!access.medications ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          La familia no ha compartido esta sección con tu rol.
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

          {!loading && active.length === 0 && (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Todavía no hay medicinas.{" "}
              {isFamily ? (
                <Link href="/ficha" className="font-semibold text-[var(--primary)] hover:underline">
                  Añádelas en la Ficha →
                </Link>
              ) : (
                "La familia las añade en la Ficha."
              )}
            </p>
          )}

          <div className="grid gap-4">
            {active.map((m) => (
              <MedScheduleCard
                key={m.id}
                med={m}
                isFamily={isFamily}
                viewOverrides={overrides}
                onChanged={load}
              />
            ))}
          </div>

          {!loading && active.length > 0 && (
            <p className="text-xs text-[var(--muted)]">
              El nombre, la dosis y quién receta cada medicina se editan en la{" "}
              <Link href="/ficha" className="font-semibold text-[var(--primary)] hover:underline">
                Ficha
              </Link>
              . {suspended > 0 ? `Hay ${suspended} suspendida(s), que no aparecen aquí.` : ""}
            </p>
          )}

          <DoseHistory meds={meds} isFamily={isFamily} />
        </>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Esta pantalla es un registro y un recordatorio: no sugiere dosis ni sustituye la indicación de un
        médico. Proyecto escolar: usa medicinas de ejemplo, nunca las de un menor real.
      </div>
    </div>
  );
}