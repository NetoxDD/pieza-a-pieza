"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_LABELS, hhmm } from "@/lib/routines";
import MedExtras from "@/components/meds/MedExtras";
import { ADMIN_ROLES, scheduleText, type Med } from "@/lib/meds";
import { defaultAllowed, formatDate, medCategoryLabel } from "@/lib/ficha";
import { roleLabel } from "@/lib/roles";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function MedScheduleCard({
  med,
  isFamily,
  viewOverrides,
    rxValidUntil,
  onHand,
  docs,
  onChanged,
}: {
  med: Med;
  isFamily: boolean;
  viewOverrides: { role: string; allowed: boolean }[];
    rxValidUntil: string | null;
  onHand: number | null;
  docs: { id: string; title: string; valid_until: string | null }[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    asNeeded: false,
    times: [] as string[],
    days: [1, 2, 3, 4, 5, 6, 7] as number[],
    endsOn: "",
    grace: "60",
    minInterval: "",
  });
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
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
    setForm({
      asNeeded: med.as_needed,
      times: med.times.map(hhmm),
      days: med.days,
      endsOn: med.ends_on ?? "",
      grace: String(med.grace_min),
      minInterval: med.min_interval_hours != null ? String(med.min_interval_hours) : "",
    });
    setMsg("");
    setEditing(true);
  };

  const toggleDay = (d: number) => {
    const has = form.days.includes(d);
    if (has && form.days.length === 1) return;
    setForm({ ...form, days: has ? form.days.filter((x) => x !== d) : [...form.days, d].sort() });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const times = form.asNeeded ? [] : Array.from(new Set(form.times.filter(Boolean))).sort();
    const { data, error } = await supabase
      .from("child_medications")
      .update({
        as_needed: form.asNeeded,
        times,
        days: form.days,
        ends_on: form.endsOn || null,
        grace_min: Number(form.grace) || 0,
        min_interval_hours: form.minInterval ? Number(form.minInterval) : null,
      })
      .eq("id", med.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMsg("No se pudo guardar. Revisa los datos e intenta de nuevo.");
      return;
    }
    setEditing(false);
    onChanged();
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
          <p className="text-xs text-[var(--muted)]">
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
        <form onSubmit={save} className="mt-4 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold">Tipo de horario</legend>
            <div className="flex flex-wrap gap-2">
              {[
                { v: false, label: "Horario fijo" },
                { v: true, label: "Solo si es necesario" },
              ].map((o) => (
                <label
                  key={String(o.v)}
                  className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                    form.asNeeded === o.v
                      ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                      : "border-[var(--border)] hover:bg-[var(--sage)]"
                  }`}
                >
                  <input
                    type="radio"
                    name={`kind-${med.id}`}
                    checked={form.asNeeded === o.v}
                    onChange={() => setForm({ ...form, asNeeded: o.v })}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          {!form.asNeeded && (
            <>
              <fieldset className="grid gap-2">
                <legend className="text-xs font-semibold">Horas de cada toma</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {form.times.map((t, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <input
                        type="time"
                        value={t}
                        aria-label={`Hora ${i + 1}`}
                        onChange={(e) => {
                          const next = [...form.times];
                          next[i] = e.target.value;
                          setForm({ ...form, times: next });
                        }}
                        className={input}
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, times: form.times.filter((_, k) => k !== i) })}
                        aria-label={`Quitar la hora ${i + 1}`}
                        className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                      >
                        Quitar
                      </button>
                    </span>
                  ))}
                  {form.times.length < 12 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, times: [...form.times, "08:00"] })}
                      className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                    >
                      + Añadir hora
                    </button>
                  )}
                </div>
                {form.times.length === 0 && (
                  <p className="text-xs text-[var(--muted)]">Sin horas, la medicina no aparece en Hoy.</p>
                )}
              </fieldset>

              <fieldset>
                <legend className="text-xs font-semibold">Días</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {DAY_LABELS.map((label, i) => {
                    const d = i + 1;
                    const on = form.days.includes(d);
                    return (
                      <label
                        key={d}
                        className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-3 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                          on
                            ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                            : "border-[var(--border)] text-[var(--muted)]"
                        }`}
                      >
                        <input type="checkbox" checked={on} onChange={() => toggleDay(d)} className="sr-only" />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
                Margen de tolerancia (minutos)
                <input
                  type="number"
                  min={0}
                  max={720}
                  value={form.grace}
                  onChange={(e) => setForm({ ...form, grace: e.target.value })}
                  className={input}
                />
              </label>
            </>
          )}

          {form.asNeeded && (
            <label className="grid max-w-64 gap-1.5 text-xs font-semibold">
              Espera mínima entre dosis, en horas (opcional)
              <input
                type="number"
                min={0.5}
                max={48}
                step={0.5}
                value={form.minInterval}
                onChange={(e) => setForm({ ...form, minInterval: e.target.value })}
                placeholder="Según indique tu médico"
                className={input}
              />
              <small className="text-xs font-normal text-[var(--muted)]">
                La app solo compara horas y avisa, sin bloquear. No la propone ella.
              </small>
            </label>
          )}

          <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
            Termina el (opcional)
            <input
              type="date"
              value={form.endsOn}
              onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
              className={input}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar horario"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isFamily && (
        <fieldset className="mt-5 grid gap-2">
          <legend className="text-sm font-semibold">Quién más puede registrar dosis de esta medicina</legend>
          <p className="text-xs text-[var(--muted)]">
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
            <p key={r} role="status" className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[var(--sand-text)]">
              {roleLabel[r]} puede registrar, pero todavía no puede ver Medicamentos. Actívalo en Ficha →
              Privacidad para que le funcione.
            </p>
          ))}
        </fieldset>
      )}
            <MedExtras
        med={med}
        isFamily={isFamily}
        rxValidUntil={rxValidUntil}
        onHand={onHand}
        docs={docs}
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