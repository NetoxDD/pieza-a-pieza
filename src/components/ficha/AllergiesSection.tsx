"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { allergyKindLabel, type Allergy } from "@/lib/ficha";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const rank: Record<string, number> = { grave: 0, moderada: 1, leve: 2 };
const empty = { substance: "", kind: "alimento", reaction: "", severity: "moderada" };

export default function AllergiesSection() {
  const { child } = useChild();
  const { allergies, editable, reload } = useChildProfile();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const sorted = allergies.slice().sort((a, b) => rank[a.severity] - rank[b.severity]);

  const startNew = () => {
    setForm(empty);
    setEditingId(null);
    setMsg("");
    setOpen(true);
  };

  const startEdit = (a: Allergy) => {
    setForm({ substance: a.substance, kind: a.kind, reaction: a.reaction ?? "", severity: a.severity });
    setEditingId(a.id);
    setMsg("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const substance = form.substance.trim();
    if (!substance) return;
    setBusy(true);
    setMsg("");
    const row = {
      substance,
      kind: form.kind,
      reaction: form.reaction.trim() || null,
      severity: form.severity,
    };
    let failed = false;
    if (editingId) {
      const { data, error } = await supabase
        .from("child_allergies")
        .update(row)
        .eq("id", editingId)
        .select("id");
      failed = !!error || !data?.length;
    } else {
      const { error } = await supabase.from("child_allergies").insert({ child_id: child.id, ...row });
      failed = !!error;
    }
    setBusy(false);
    if (failed) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setOpen(false);
    reload();
  };

  const remove = async (a: Allergy) => {
    if (!window.confirm(`¿Eliminar la alergia a ${a.substance}?`)) return;
    const { data, error } = await supabase
      .from("child_allergies")
      .delete()
      .eq("id", a.id)
      .select("id");
    if (error || !data?.length) setMsg("No se pudo eliminar.");
    else reload();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Alergias</h2>
        {editable && !open && (
          <button
            type="button"
            onClick={startNew}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            + Añadir
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          No hay alergias registradas. Eso no significa que no existan: la familia puede no haberlas
          anotado todavía.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {sorted.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="[overflow-wrap:anywhere]">{a.substance}</strong>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.6875rem] font-bold ${
                      a.severity === "grave"
                        ? "bg-[var(--danger)] text-[var(--surface)]"
                        : "bg-[var(--sand)] text-[var(--sand-text)]"
                    }`}
                  >
                    {a.severity === "grave" && <AlertTriangle size={12} aria-hidden />}
                    {a.severity === "grave" ? "Grave" : a.severity === "moderada" ? "Moderada" : "Leve"}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{allergyKindLabel[a.kind]}</span>
                </div>
                {a.reaction && (
                  <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{a.reaction}</p>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(a)}
                    aria-label={`Editar alergia a ${a.substance}`}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(a)}
                    aria-label={`Eliminar alergia a ${a.substance}`}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <h3 className="text-sm font-semibold">{editingId ? "Editar alergia" : "Nueva alergia"}</h3>
          <label className="grid gap-1.5 text-xs font-semibold">
            ¿A qué es alérgico?
            <input
              value={form.substance}
              onChange={(e) => setForm({ ...form, substance: e.target.value })}
              maxLength={80}
              required
              placeholder="Ej. Cacahuate, penicilina, polen"
              className={input}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Tipo
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={input}>
                {Object.entries(allergyKindLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Gravedad
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className={input}
              >
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Reacción (opcional)
            <input
              value={form.reaction}
              onChange={(e) => setForm({ ...form, reaction: e.target.value })}
              maxLength={200}
              placeholder="Ej. Ronchas, dificultad para respirar"
              className={input}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !form.substance.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
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