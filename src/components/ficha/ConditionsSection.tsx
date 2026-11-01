"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";

export default function ConditionsSection() {
  const { child } = useChild();
  const { conditions, access, editable, reload } = useChildProfile();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!access.conditions)
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Otras condiciones</h2>
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          La familia no ha compartido esta sección con tu rol.
        </p>
      </section>
    );

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.from("child_conditions").upsert({
      child_id: child.id,
      body: text.trim() || null,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setEditing(false);
    reload();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Otras condiciones</h2>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => {
              setText(conditions ?? "");
              setMsg("");
              setEditing(true);
            }}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar
          </button>
        )}
      </div>

      {!editing ? (
        conditions ? (
          <p className="mt-3 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{conditions}</p>
        ) : (
          <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
            Es un espacio opcional para anotar algo de salud que el equipo deba saber. No hace falta
            llenarlo.
          </p>
        )
      ) : (
        <form onSubmit={save} className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold">
            Condiciones de salud relevantes
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              rows={4}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
            />
          </label>
          <p className="text-xs text-[var(--muted)]">{text.length} de 500 caracteres</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
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

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </section>
  );
}