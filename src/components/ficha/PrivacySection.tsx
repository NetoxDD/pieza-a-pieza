"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { CONFIGURABLE_ROLES, SECTIONS, defaultAllowed, type SectionKey } from "@/lib/ficha";
import { roleLabel } from "@/lib/roles";

type Row = { section: SectionKey; role: string; allowed: boolean };

export default function PrivacySection() {
  const { child } = useChild();
  const { canEdit } = useChildProfile();
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("child_section_access")
      .select("section,role,allowed")
      .eq("child_id", child.id);
    if (error) setMsg("No se pudo cargar la configuración de privacidad.");
    else {
      setMsg("");
      setRows(data as Row[]);
    }
  }, [child.id]);

  useEffect(() => {
    if (canEdit) load();
  }, [canEdit, load]);

  if (!canEdit) return null;

  const effective = (s: SectionKey, r: string) =>
    rows.find((x) => x.section === s && x.role === r)?.allowed ?? defaultAllowed(s, r);

  const toggle = async (s: SectionKey, r: string, value: boolean) => {
    setBusy(true);
    setMsg("");
    // Si coincide con el valor inicial, se borra el cambio: así la tabla guarda solo excepciones
    const result =
      value === defaultAllowed(s, r)
        ? await supabase
            .from("child_section_access")
            .delete()
            .eq("child_id", child.id)
            .eq("section", s)
            .eq("role", r)
        : await supabase
            .from("child_section_access")
            .upsert(
              { child_id: child.id, section: s, role: r, allowed: value },
              { onConflict: "child_id,section,role" }
            );
    setBusy(false);
    if (result.error) setMsg("No se pudo guardar el cambio.");
    await load();
  };

  const reset = async () => {
    if (!window.confirm("¿Restablecer todos los permisos a sus valores iniciales?")) return;
    setBusy(true);
    const { error } = await supabase.from("child_section_access").delete().eq("child_id", child.id);
    setBusy(false);
    if (error) setMsg("No se pudo restablecer.");
    await load();
  };

  return (
    <section className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div>
        <h2 className="text-lg font-semibold">Privacidad: quién ve qué</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          La familia siempre ve todo. Los cambios se aplican de inmediato y quedan en el historial.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl bg-[var(--sage)] p-4 text-sm">
        <Lock size={18} aria-hidden className="mt-0.5 shrink-0 text-[var(--primary)]" />
        <p>
          <strong>Alergias y contactos de emergencia</strong> los ve siempre todo el equipo. No se
          pueden ocultar, porque son para la seguridad de {child.name}.
        </p>
      </div>

      {SECTIONS.map((s) => (
        <fieldset key={s.key} className="grid gap-2">
          <legend className="text-sm font-semibold">{s.label}</legend>
          <p className="text-xs text-[var(--muted)]">{s.hint}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {CONFIGURABLE_ROLES.map((r) => {
              const on = effective(s.key, r);
              return (
                <label
                  key={r}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                    on
                      ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--sage)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={busy}
                    onChange={(e) => toggle(s.key, r, e.target.checked)}
                    className="sr-only"
                  />
                  <span aria-hidden>{on ? "✓" : "✗"}</span>
                  {roleLabel[r]}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
        >
          Restablecer valores iniciales
        </button>
      </div>

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </section>
  );
}