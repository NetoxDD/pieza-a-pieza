"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import NextEvent from "@/components/NextEvent";
import WeeklyChart from "@/components/WeeklyChart";

type Support = { id: string; text: string; active: boolean; created_at: string };
type Goal = {
  id: string;
  created_by: string;
  area: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  observing: string | null;
  goal_supports: Support[];
};

const areas = ["Comunicación", "Rutinas y transiciones", "Bienestar y entorno", "Autonomía", "Aprendizaje"];
const statuses = ["Nuevas iniciativas", "Seguimos explorando", "Apoyo que funciona"];

const badgeStyle: Record<string, string> = {
  "Nuevas iniciativas": "bg-[var(--sage)] text-[var(--primary)]",
  "Seguimos explorando": "bg-[var(--blue)] text-[var(--blue-text)]",
  "Apoyo que funciona": "bg-[var(--sand)] text-[var(--sand-text)]",
};

const inputCls =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const areaCls =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";

function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={`Progreso de ${label}: ${value}%`}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--sage) 0deg)` }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)] text-xs font-bold text-[var(--primary)]">
        {value}%
      </div>
    </div>
  );
}

function GoalCard({ goal, userId, reload }: { goal: Goal; userId: string; reload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(goal.status);
  const [progress, setProgress] = useState(goal.progress);
  const [observing, setObserving] = useState(goal.observing ?? "");
  const [newSupport, setNewSupport] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const supports = goal.goal_supports.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  const activeCount = supports.filter((s) => s.active).length;

  const startEdit = () => {
    setStatus(goal.status);
    setProgress(goal.progress);
    setObserving(goal.observing ?? "");
    setMsg("");
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase
      .from("goals")
      .update({ status, progress, observing: observing.trim() || null })
      .eq("id", goal.id);
    setBusy(false);
    if (error) setMsg("No se pudo guardar.");
    else {
      setEditing(false);
      reload();
    }
  };

  const toggle = async (s: Support) => {
    const { error } = await supabase.from("goal_supports").update({ active: !s.active }).eq("id", s.id);
    if (error) setMsg("No se pudo actualizar el apoyo.");
    else reload();
  };

  const addSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newSupport.trim();
    if (!text) return;
    const { error } = await supabase.from("goal_supports").insert({ goal_id: goal.id, text });
    if (error) setMsg("No se pudo añadir el apoyo.");
    else {
      setNewSupport("");
      reload();
    }
  };

  const removeSupport = async (id: string) => {
    const { error } = await supabase.from("goal_supports").delete().eq("id", id);
    if (error) setMsg("No se pudo quitar el apoyo.");
    else reload();
  };

  const removeGoal = async () => {
    if (!window.confirm("¿Eliminar este objetivo y sus apoyos?")) return;
    const { error } = await supabase.from("goals").delete().eq("id", goal.id);
    if (error) setMsg("No se pudo eliminar el objetivo.");
    else reload();
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">{goal.area}</p>
          <h2 className="mt-1 text-lg font-semibold [overflow-wrap:anywhere]">{goal.title}</h2>
          <span
            className={`mt-2 inline-block rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold ${
              badgeStyle[goal.status] ?? badgeStyle["Seguimos explorando"]
            }`}
          >
            {goal.status}
          </span>
        </div>
        <ProgressRing value={goal.progress} label={goal.title} />
      </div>

      {goal.description && <p className="mt-4 text-sm [overflow-wrap:anywhere]">{goal.description}</p>}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Apoyos acordados</h3>
        {supports.length > 0 && (
          <small className="text-xs text-[var(--muted)]">
            {activeCount} de {supports.length} en marcha
          </small>
        )}
      </div>

      {supports.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Aún no hay apoyos. Añade el primero con Editar.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {supports.map((s) => (
            <li key={s.id} className="flex items-start gap-2">
              <label
                className={`flex min-h-11 flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  s.active
                    ? "border-[var(--primary)]/30 bg-[var(--sage)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={() => toggle(s)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="[overflow-wrap:anywhere]">{s.text}</span>
              </label>
              {editing && (
                <button
                  type="button"
                  onClick={() => removeSupport(s.id)}
                  aria-label={`Quitar apoyo: ${s.text}`}
                  className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {goal.observing && !editing && (
        <div className="mt-5 rounded-r-lg border-l-4 border-[var(--primary)] bg-[var(--background)] p-4 text-sm">
          <strong>Lo que estamos observando</strong>
          <p className="mt-1 [overflow-wrap:anywhere]">{goal.observing}</p>
        </div>
      )}

      {editing ? (
        <div className="mt-5 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Etapa
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold">
            Avance: {progress}%
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="h-11 w-full accent-[var(--primary)]"
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold">
            Lo que estamos observando
            <textarea
              value={observing}
              onChange={(e) => setObserving(e.target.value)}
              maxLength={300}
              rows={3}
              className={areaCls}
            />
          </label>

          <form onSubmit={addSupport} className="flex gap-2">
            <label className="sr-only" htmlFor={`sup-${goal.id}`}>
              Nuevo apoyo
            </label>
            <input
              id={`sup-${goal.id}`}
              value={newSupport}
              onChange={(e) => setNewSupport(e.target.value)}
              maxLength={200}
              placeholder="Añadir un apoyo…"
              className={`${inputCls} flex-1`}
            />
            <button
              type="submit"
              disabled={!newSupport.trim()}
              className="min-h-11 rounded-lg border border-[var(--border)] px-4 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-50"
            >
              Añadir
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
            {goal.created_by === userId && (
              <button
                type="button"
                onClick={removeGoal}
                className="min-h-11 rounded-xl px-5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--sand)]"
              >
                Eliminar objetivo
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="mt-5 min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
        >
          Editar
        </button>
      )}

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </article>
  );
}

export default function Objetivos() {
  const { child, userId } = useChild();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [area, setArea] = useState(areas[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("goals")
      .select(
        "id,created_by,area,title,description,status,progress,observing,goal_supports(id,text,active,created_at)"
      )
      .eq("child_id", child.id)
      .order("created_at");

    if (error) setError("No se pudieron cargar los objetivos.");
    else {
      setError("");
      setGoals(data as Goal[]);
    }
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setSaving(true);
    setError("");
    const { error } = await supabase.from("goals").insert({
      child_id: child.id,
      area,
      title: clean,
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) {
      setError("No se pudo crear el objetivo. Intenta de nuevo.");
      return;
    }
    setTitle("");
    setDescription("");
    setShowForm(false);
    load();
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objetivos y apoyos</h1>
          <p className="mt-1 text-[var(--muted)]">
            Un plan compartido, flexible y centrado en lo que le ayuda.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/registro"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Registrar un avance
          </Link>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)]"
          >
            + Nuevo objetivo
          </button>
        </div>
      </div>

      <section className="rounded-2xl bg-[var(--sage)] p-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
          Su propio recorrido
        </p>
        <h2 className="mt-2 text-2xl font-medium">Acompañar, observar y ajustar juntos.</h2>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Los objetivos se acuerdan con la familia y el equipo. No son una comparación con otros niños ni
          una lista de exigencias.
        </p>
      </section>

      {showForm && (
        <form
          onSubmit={createGoal}
          className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h2 className="text-lg font-semibold">Nuevo objetivo</h2>

          <label className="grid gap-1.5 text-xs font-semibold">
            Área
            <select value={area} onChange={(e) => setArea(e.target.value)} className={inputCls}>
              {areas.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold">
            ¿Qué queremos acompañar?
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder="Ej. Anticipar los cambios de actividad"
              className={inputCls}
            />
          </label>

          <label className="grid gap-1.5 text-xs font-semibold">
            Descripción (opcional)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={600}
              rows={3}
              className={areaCls}
            />
          </label>

          <p className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[var(--sand-text)]">
            Proyecto escolar: usa objetivos de ejemplo, no información clínica real.
          </p>

          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Crear objetivo"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <WeeklyChart />

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}
          {!loading && goals.length === 0 && (
            <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
              Todavía no hay objetivos. Crea el primero con el botón «+ Nuevo objetivo».
            </p>
          )}
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} userId={userId} reload={load} />
          ))}
        </div>

        <aside className="grid gap-6">
          <NextEvent />
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Recursos relacionados</h2>
            <p className="mt-2 text-sm">Secuencia visual para anticipar la salida de casa.</p>
            <Link
              href="/documentos"
              className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Consultar documentos →
            </Link>
          </section>
          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
            Estos objetivos son contenido de la maqueta, no un plan terapéutico individualizado.
          </div>
        </aside>
      </div>
    </div>
  );
}