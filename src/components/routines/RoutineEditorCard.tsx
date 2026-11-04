"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  DAY_LABELS,
  EMOJIS,
  daysText,
  hhmm,
  placeLabel,
  type Routine,
  type Step,
} from "@/lib/routines";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

type StepForm = { id: string | null; title: string; time: string; emoji: string; note: string };

export default function RoutineEditorCard({
  routine,
  steps,
  editable,
  onChanged,
}: {
  routine: Routine;
  steps: Step[];
  editable: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    place: "ambos" as Routine["place"],
    days: [1, 2, 3, 4, 5, 6, 7] as number[],
    active: true,
  });
  const [stepForm, setStepForm] = useState<StepForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const startEdit = () => {
    setForm({ name: routine.name, place: routine.place, days: routine.days, active: routine.active });
    setMsg("");
    setEditing(true);
  };

  const toggleDay = (d: number) => {
    const has = form.days.includes(d);
    if (has && form.days.length === 1) return; // al menos un día
    setForm({ ...form, days: has ? form.days.filter((x) => x !== d) : [...form.days, d].sort() });
  };

  const saveRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase
      .from("routines")
      .update({ name, place: form.place, days: form.days, active: form.active })
      .eq("id", routine.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setEditing(false);
    onChanged();
  };

  const deleteRoutine = async () => {
    if (!window.confirm(`¿Eliminar la rutina «${routine.name}» y sus pasos? No se puede deshacer.`)) return;
    setBusy(true);
    const { data, error } = await supabase.from("routines").delete().eq("id", routine.id).select("id");
    setBusy(false);
    if (error || !data?.length) setMsg("No se pudo eliminar la rutina.");
    else onChanged();
  };

  const openNewStep = () => {
    setStepForm({ id: null, title: "", time: "", emoji: "", note: "" });
    setMsg("");
  };

  const openEditStep = (s: Step) => {
    setStepForm({ id: s.id, title: s.title, time: hhmm(s.at_time), emoji: s.emoji ?? "", note: s.note ?? "" });
    setMsg("");
  };

  const saveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepForm) return;
    const title = stepForm.title.trim();
    if (!title) return;
    setBusy(true);
    setMsg("");
    const row = {
      title,
      at_time: stepForm.time || null,
      emoji: stepForm.emoji.trim() || null,
      note: stepForm.note.trim() || null,
    };
    let failed = false;
    if (stepForm.id) {
      const { data, error } = await supabase
        .from("routine_steps")
        .update(row)
        .eq("id", stepForm.id)
        .select("id");
      failed = !!error || !data?.length;
    } else {
      const last = steps[steps.length - 1];
      const { error } = await supabase
        .from("routine_steps")
        .insert({ routine_id: routine.id, position: (last?.position ?? -1) + 1, ...row });
      failed = !!error;
    }
    setBusy(false);
    if (failed) {
      setMsg("No se pudo guardar el paso.");
      return;
    }
    setStepForm(null);
    onChanged();
  };

  const deleteStep = async (s: Step) => {
    if (!window.confirm(`¿Eliminar el paso «${s.title}»?`)) return;
    const { data, error } = await supabase.from("routine_steps").delete().eq("id", s.id).select("id");
    if (error || !data?.length) setMsg("No se pudo eliminar el paso.");
    else onChanged();
  };

  const moveStep = async (i: number, dir: -1 | 1) => {
    if (!steps[i + dir]) return;
    const order = steps.map((s) => s.id);
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    setBusy(true);
    // Se reasignan todas las posiciones para que el orden quede limpio
    const results = await Promise.all(
      order.map((id, idx) => supabase.from("routine_steps").update({ position: idx }).eq("id", id))
    );
    setBusy(false);
    if (results.some((r) => r.error)) setMsg("No se pudo reordenar.");
    onChanged();
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{routine.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[var(--blue)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--blue-text)]">
              {placeLabel[routine.place]}
            </span>
            <small className="text-xs text-[var(--muted)]">{daysText(routine.days)}</small>
            {!routine.active && (
              <span className="rounded-md bg-[var(--sand)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--sand-text)]">
                En pausa
              </span>
            )}
          </div>
        </div>
        {editable && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar rutina
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={saveRoutine} className="mt-4 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Nombre
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={60}
              required
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Lugar
            <select
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value as Routine["place"] })}
              className={input}
            >
              {Object.entries(placeLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
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
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            <span>
              Rutina activa
              <small className="block text-xs text-[var(--muted)]">
                Si la pausas, deja de aparecer en Hoy, pero se conserva.
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
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={deleteRoutine}
              disabled={busy}
              className="min-h-11 rounded-xl px-5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--sand)]"
            >
              Eliminar rutina
            </button>
          </div>
        </form>
      )}

      <h3 className="mt-5 text-sm font-semibold">Pasos</h3>
      {steps.length === 0 ? (
        <p className="mt-2 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Esta rutina aún no tiene pasos.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-[var(--border)]">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold [overflow-wrap:anywhere]">
                  {s.emoji && <span aria-hidden>{s.emoji} </span>}
                  {s.title}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {[s.at_time && hhmm(s.at_time), s.note].filter(Boolean).join(" · ")}
                </p>
              </div>
              {editable && (
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label={`Subir «${s.title}»`}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-40"
                  >
                    <ChevronUp size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1 || busy}
                    aria-label={`Bajar «${s.title}»`}
                    className="grid min-h-11 min-w-11 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-40"
                  >
                    <ChevronDown size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditStep(s)}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteStep(s)}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {editable && !stepForm && (
        <button
          type="button"
          onClick={openNewStep}
          className="mt-3 min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
        >
          + Añadir paso
        </button>
      )}

      {editable && stepForm && (
        <form onSubmit={saveStep} className="mt-3 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <h4 className="text-sm font-semibold">{stepForm.id ? "Editar paso" : "Nuevo paso"}</h4>
          <label className="grid gap-1.5 text-xs font-semibold">
            ¿Qué hacemos?
            <input
              value={stepForm.title}
              onChange={(e) => setStepForm({ ...stepForm, title: e.target.value })}
              maxLength={80}
              required
              placeholder="Ej. Cepillarnos los dientes"
              className={input}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Hora (opcional)
              <input
                type="time"
                value={stepForm.time}
                onChange={(e) => setStepForm({ ...stepForm, time: e.target.value })}
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Emoji (opcional)
              <input
                value={stepForm.emoji}
                onChange={(e) => setStepForm({ ...stepForm, emoji: e.target.value })}
                maxLength={8}
                className={input}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Emojis sugeridos">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setStepForm({ ...stepForm, emoji: em })}
                aria-label={`Usar el emoji ${em}`}
                className={`grid min-h-11 min-w-11 place-items-center rounded-lg border text-xl ${
                  stepForm.emoji === em
                    ? "border-[var(--primary)] bg-[var(--sage)]"
                    : "border-[var(--border)] hover:bg-[var(--sage)]"
                }`}
              >
                {em}
              </button>
            ))}
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Nota (opcional)
            <input
              value={stepForm.note}
              onChange={(e) => setStepForm({ ...stepForm, note: e.target.value })}
              maxLength={200}
              placeholder="Ej. Con la secuencia visual"
              className={input}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !stepForm.title.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar paso"}
            </button>
            <button
              type="button"
              onClick={() => setStepForm(null)}
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
    </article>
  );
}