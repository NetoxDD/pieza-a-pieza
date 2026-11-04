"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import RoutineEditorCard from "@/components/routines/RoutineEditorCard";
import { DAY_LABELS, placeLabel, type Routine, type Step } from "@/lib/routines";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

type Example = { name: string; steps: [string, string | null, string][] };

const EXAMPLES: Example[] = [
  {
    name: "Mañana",
    steps: [
      ["Despertar con luz suave", "07:30", "🌅"],
      ["Desayunar", "08:00", "🍽️"],
      ["Cepillarnos los dientes", null, "🪥"],
      ["Prepararnos para salir", "08:30", "🎒"],
    ],
  },
  {
    name: "Antes de dormir",
    steps: [
      ["Un cuento compartido", "19:30", "📚"],
      ["Luz suave y anticipar los pasos", null, "🕯️"],
      ["A descansar", "20:30", "😴"],
    ],
  },
];

export default function Rutinas() {
  const { child, role } = useChild();
  const isFamily = role === "familia";

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [place, setPlace] = useState<Routine["place"]>("ambos");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);

  const load = useCallback(async () => {
    const r = await supabase
      .from("routines")
      .select("id,name,place,days,position,active")
      .eq("child_id", child.id)
      .order("position")
      .order("created_at");
    if (r.error) {
      setError("No se pudieron cargar las rutinas.");
      setLoading(false);
      return;
    }
    const list = r.data as Routine[];
    const s = await supabase
      .from("routine_steps")
      .select("id,routine_id,title,at_time,emoji,note,position")
      .in("routine_id", list.map((x) => x.id))
      .order("position");
    if (s.error) {
      setError("No se pudieron cargar los pasos.");
      setLoading(false);
      return;
    }
    setRoutines(list);
    setSteps(s.data as Step[]);
    setError("");
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDay = (d: number) => {
    const has = days.includes(d);
    if (has && days.length === 1) return;
    setDays(has ? days.filter((x) => x !== d) : [...days, d].sort());
  };

  const createRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setMsg("");
    const { error } = await supabase
      .from("routines")
      .insert({ child_id: child.id, name: n, place, days, position: routines.length });
    setBusy(false);
    if (error) {
      setMsg("No se pudo crear la rutina.");
      return;
    }
    setName("");
    setShowForm(false);
    load();
  };

  const seed = async () => {
    setBusy(true);
    setMsg("");
    for (const [i, ex] of EXAMPLES.entries()) {
      const { data, error } = await supabase
        .from("routines")
        .insert({ child_id: child.id, name: ex.name, place: "casa", days: [1, 2, 3, 4, 5, 6, 7], position: routines.length + i })
        .select("id")
        .single();
      if (error) {
        setMsg("No se pudieron crear los ejemplos.");
        break;
      }
      const rows = ex.steps.map(([title, time, emoji], k) => ({
        routine_id: data.id,
        title,
        at_time: time,
        emoji,
        position: k,
      }));
      const st = await supabase.from("routine_steps").insert(rows);
      if (st.error) {
        setMsg("No se pudieron crear los pasos de ejemplo.");
        break;
      }
    }
    setBusy(false);
    load();
  };

  // Quien no es de la familia solo ve las rutinas activas
  const visible = isFamily ? routines : routines.filter((r) => r.active);

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rutinas</h1>
          <p className="mt-1 text-[var(--muted)]">
            {isFamily
              ? "Tú decides los pasos. El equipo los marca durante el día."
              : "Así es el día de " + child.name + ". Solo la familia puede cambiarlas."}
          </p>
        </div>
        {isFamily && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="min-h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            + Nueva rutina
          </button>
        )}
      </div>

      {showForm && isFamily && (
        <form
          onSubmit={createRoutine}
          className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h2 className="text-lg font-semibold">Nueva rutina</h2>
          <label className="grid gap-1.5 text-xs font-semibold">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              placeholder="Ej. Después de la escuela"
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Lugar
            <select value={place} onChange={(e) => setPlace(e.target.value as Routine["place"])} className={input}>
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
                const on = days.includes(d);
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
          <p className="text-xs text-[var(--muted)]">Los pasos se añaden después, dentro de la rutina.</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Creando…" : "Crear rutina"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && !error && visible.length === 0 && (
        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-sm text-[var(--muted)]">
            {isFamily
              ? "Todavía no hay rutinas. Puedes crear la primera, o empezar con un ejemplo que luego cambies a tu gusto."
              : "La familia aún no ha creado rutinas."}
          </p>
          {isFamily && (
            <div>
              <button
                type="button"
                onClick={seed}
                disabled={busy}
                className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60"
              >
                {busy ? "Creando…" : "Empezar con un ejemplo"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {visible.map((r) => (
          <RoutineEditorCard
            key={r.id}
            routine={r}
            steps={steps.filter((s) => s.routine_id === r.id)}
            editable={isFamily}
            onChanged={load}
          />
        ))}
      </div>

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Las rutinas son una guía, no una lista de exigencias. Proyecto escolar: usa pasos de ejemplo.
      </div>
    </div>
  );
}