"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { formatDate, medCategoryLabel, type Medication } from "@/lib/ficha";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const empty = {
  name: "",
  dose: "",
  frequency: "",
  category: "general",
  prescriber: "",
  started_on: "",
  notes: "",
  active: true,
};

function MedItem({
  m,
  editable,
  onEdit,
  onRemove,
}: {
  m: Medication;
  editable: boolean;
  onEdit: (m: Medication) => void;
  onRemove: (m: Medication) => void;
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="[overflow-wrap:anywhere]">{m.name}</strong>
          <span className="rounded-md bg-[var(--sage)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--primary)]">
            {medCategoryLabel[m.category]}
          </span>
          {!m.active && (
            <span className="rounded-md bg-[var(--sand)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--sand-text)]">
              Suspendido
            </span>
          )}
        </div>
        {(m.dose || m.frequency) && (
          <p className="mt-1 text-sm [overflow-wrap:anywhere]">
            {[m.dose, m.frequency].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="mt-1 text-xs text-[var(--muted)] [overflow-wrap:anywhere]">
          {[m.prescriber && `Receta: ${m.prescriber}`, m.started_on && `Desde ${formatDate(m.started_on)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {m.notes && <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{m.notes}</p>}
      </div>
      {editable && (
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onEdit(m)}
            aria-label={`Editar ${m.name}`}
            className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onRemove(m)}
            aria-label={`Eliminar ${m.name}`}
            className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
          >
            Eliminar
          </button>
        </div>
      )}
    </li>
  );
}

export default function MedicationsSection() {
  const { child } = useChild();
  const { meds, access, editable, reload } = useChildProfile();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!access.medications)
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Medicamentos</h2>
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          La familia no ha compartido esta sección con tu rol.
        </p>
      </section>
    );

  const current = meds.filter((m) => m.active);
  const past = meds.filter((m) => !m.active);
  const byCategory = (cat: string) => current.filter((m) => m.category === cat);

  const startNew = () => {
    setForm(empty);
    setEditingId(null);
    setMsg("");
    setOpen(true);
  };

  const startEdit = (m: Medication) => {
    setForm({
      name: m.name,
      dose: m.dose ?? "",
      frequency: m.frequency ?? "",
      category: m.category,
      prescriber: m.prescriber ?? "",
      started_on: m.started_on ?? "",
      notes: m.notes ?? "",
      active: m.active,
    });
    setEditingId(m.id);
    setMsg("");
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    setMsg("");
    const row = {
      name,
      dose: form.dose.trim() || null,
      frequency: form.frequency.trim() || null,
      category: form.category,
      prescriber: form.prescriber.trim() || null,
      started_on: form.started_on || null,
      notes: form.notes.trim() || null,
      active: form.active,
    };
    let failed = false;
    if (editingId) {
      const { data, error } = await supabase
        .from("child_medications")
        .update(row)
        .eq("id", editingId)
        .select("id");
      failed = !!error || !data?.length;
    } else {
      const { error } = await supabase.from("child_medications").insert({ child_id: child.id, ...row });
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

  const remove = async (m: Medication) => {
    if (!window.confirm(`¿Eliminar ${m.name} de la lista?`)) return;
    const { data, error } = await supabase
      .from("child_medications")
      .delete()
      .eq("id", m.id)
      .select("id");
    if (error || !data?.length) setMsg("No se pudo eliminar.");
    else reload();
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Medicamentos</h2>
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

      <p className="mt-2 text-xs text-[var(--muted)]">
        Lo escribe la familia a partir de lo que indica su médico. La app no sugiere ni calcula
        dosis. Ante cualquier duda, consulta al médico.
      </p>

      {meds.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          No hay medicamentos registrados.
        </p>
      ) : (
        <>
          {(["tdah_autismo", "general"] as const).map((cat) =>
            byCategory(cat).length > 0 ? (
              <div key={cat} className="mt-4">
                <h3 className="text-sm font-semibold text-[var(--muted)]">{medCategoryLabel[cat]}</h3>
                <ul className="divide-y divide-[var(--border)]">
                  {byCategory(cat).map((m) => (
                    <MedItem key={m.id} m={m} editable={editable} onEdit={startEdit} onRemove={remove} />
                  ))}
                </ul>
              </div>
            ) : null
          )}
          {past.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-[var(--muted)]">Suspendidos</h3>
              <ul className="divide-y divide-[var(--border)] opacity-80">
                {past.map((m) => (
                  <MedItem key={m.id} m={m} editable={editable} onEdit={startEdit} onRemove={remove} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <h3 className="text-sm font-semibold">{editingId ? "Editar medicamento" : "Nuevo medicamento"}</h3>
          <label className="grid gap-1.5 text-xs font-semibold">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={80}
              required
              className={input}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Dosis (opcional)
              <input
                value={form.dose}
                onChange={(e) => setForm({ ...form, dose: e.target.value })}
                maxLength={60}
                placeholder="Como la indica el médico"
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Frecuencia (opcional)
              <input
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                maxLength={80}
                placeholder="Ej. Cada mañana"
                className={input}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Categoría
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={input}
              >
                {Object.entries(medCategoryLabel).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Lo toma desde (opcional)
              <input
                type="date"
                value={form.started_on}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, started_on: e.target.value })}
                className={input}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Quién lo receta (opcional)
            <input
              value={form.prescriber}
              onChange={(e) => setForm({ ...form, prescriber: e.target.value })}
              maxLength={80}
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Notas (opcional)
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={200}
              placeholder="Ej. Con el desayuno"
              className={input}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span>
              Lo toma actualmente
              <small className="block text-xs text-[var(--muted)]">
                Si lo desmarcas, pasa a "Suspendidos" y se conserva como historial.
              </small>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !form.name.trim()}
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