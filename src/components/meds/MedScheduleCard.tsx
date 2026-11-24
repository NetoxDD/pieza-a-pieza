"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { hhmm } from "@/lib/routines";
import MedExtras from "@/components/meds/MedExtras";
import { ADMIN_ROLES, scheduleText, type Med, type Pause, type Runout } from "@/lib/meds";
import { defaultAllowed, formatDate, medCategoryLabel } from "@/lib/ficha";
import { roleLabel } from "@/lib/roles";
import ScheduleEditor from "@/components/meds/ScheduleEditor"; // 1. Added import
import PausePanel from "@/components/meds/PausePanel";

export default function MedScheduleCard({
  med,
  isFamily,
  viewOverrides,
  rxValidUntil,
  onHand,
     pauses,
   runout,
  docs,
  onChanged,
}: {
  med: Med;
  isFamily: boolean;
  viewOverrides: { role: string; allowed: boolean }[];
  rxValidUntil: string | null;
  onHand: number | null;
  docs: { id: string; title: string; valid_until: string | null }[];
     pauses: Pause[];
   runout: Runout | null | undefined;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  const loadRoles = async () => {
    const { data } = await supabase.from("med_administer_roles").select("role").eq("medication_id", med.id);
    setRoles(new Set((data ?? []).map((r) => r.role as string)));
  };

  useEffect(() => {
    if (isFamily) loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [med.id, isFamily]);

  const startEdit = () => {
    setMsg("");
    setEditing(true);
  };

  const toggleRole = async (role: string) => {
    setMsg("");
    const result = roles.has(role)
      ? await supabase.from("med_administer_roles").delete().eq("medication_id", med.id).eq("role", role)
      : await supabase.from("med_administer_roles").insert({ medication_id: med.id, role });
    if (result.error) setMsg("No se pudo cambiar el permiso.");
    await loadRoles();
  };

  const canView = (role: string) =>
    viewOverrides.find((o) => o.role === role)?.allowed ?? defaultAllowed("medications", role);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{med.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            {[med.dose, med.frequency, medCategoryLabel[med.category]].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-sm font-semibold">{scheduleText(med)}</p>
          <p className="text-sm text-[var(--muted)]">
            {[
              med.ends_on && `Termina el ${formatDate(med.ends_on)}`,
              !med.as_needed && `Margen de ${med.grace_min} min`,
              med.min_interval_hours != null && `Espera mínima: ${med.min_interval_hours} h`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {isFamily && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar horario
          </button>
        )}
      </div>

      {editing && (
        <ScheduleEditor
          med={med}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onChanged();
          }}
        />
      )}

      {isFamily && (
        <fieldset className="mt-5 grid gap-2">
          <legend className="text-sm font-semibold">Quién más puede registrar dosis de esta medicina</legend>
          <p className="text-sm text-[var(--muted)]">
            La familia siempre puede. El pediatra solo consulta. Si habilitas a otro rol, también debe poder
            ver la sección Medicamentos.
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {ADMIN_ROLES.map((r) => {
              const on = roles.has(r);
              return (
                <label
                  key={r}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                    on
                      ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--sage)]"
                  }`}
                >
                  <input type="checkbox" checked={on} onChange={() => toggleRole(r)} className="sr-only" />
                  <span aria-hidden>{on ? "✓" : "✗"}</span>
                  {roleLabel[r]}
                </label>
              );
            })}
          </div>
          {ADMIN_ROLES.filter((r) => roles.has(r) && !canView(r)).map((r) => (
            <p key={r} role="status" className="rounded-lg bg-[var(--sand)] p-3 text-sm text-[var(--sand-text)]">
              {roleLabel[r]} puede registrar, pero todavía no puede ver Medicamentos. Actívalo en Ficha →
              Privacidad para que le funcione.
            </p>
          ))}
        </fieldset>
      )}

         <PausePanel med={med} pauses={pauses} isFamily={isFamily} onChanged={onChanged} />
      <MedExtras
        med={med}
        isFamily={isFamily}
        rxValidUntil={rxValidUntil}
        onHand={onHand}
        docs={docs}
        runout={runout}
        onChanged={onChanged}
      />

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </article>
  );
}