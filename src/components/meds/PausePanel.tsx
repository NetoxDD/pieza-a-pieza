"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { localDate } from "@/lib/routines";
import { formatDate } from "@/lib/ficha";
import { pauseActive, type Med, type Pause } from "@/lib/meds";

const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
};

const KNOWN = [
  "Solo la familia",
  "Ya hay una pausa",
  "La pausa",
  "La fecha",
  "Esa pausa",
  "Esta pausa",
  "El motivo",
  "Medicamento no encontrado",
];
const msg = (e: { message?: string } | null) =>
  e?.message && KNOWN.some((k) => e.message!.startsWith(k)) ? e.message : "No se pudo guardar el cambio.";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";
const small =
  "min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)] disabled:opacity-40";

type Act = { id: string; kind: "resume" | "end" };

export default function PausePanel({
  med,
  pauses,
  isFamily,
  onChanged,
}: {
  med: Med;
  pauses: Pause[];
  isFamily: boolean;
  onChanged: () => void;
}) {
  const today = localDate();
  const [creating, setCreating] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState("");
  const [why, setWhy] = useState("");
  const [act, setAct] = useState<Act | null>(null);
  const [actDate, setActDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const current = pauses.filter((p) => p.to_date === null || p.to_date >= today);
  const past = pauses.filter((p) => p.to_date !== null && p.to_date < today).slice(0, 3);

  const done = (e: { message?: string } | null) => {
    setBusy(false);
    if (e) {
      setError(msg(e));
      return;
    }
    setError("");
    setAct(null);
    setCreating(false);
    setTo("");
    setWhy("");
    onChanged();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("pause_med", {
      mid: med.id,
      d_from: from,
      d_to: to || null,
      why: why.trim() || null,
    });
    done(error);
  };

  const submitAct = async (p: Pause, e: React.FormEvent) => {
    e.preventDefault();
    if (!act) return;
    setBusy(true);
    if (act.kind === "resume") {
      // Reanudar el día R = el último día de pausa es R - 1; si R es el primer día, la pausa se cancela
      if (actDate <= p.from_date) {
        const { error } = await supabase.rpc("cancel_pause", { pid: p.id });
        return done(error);
      }
      const { error } = await supabase.rpc("end_pause", { pid: p.id, last_day: addDays(actDate, -1) });
      return done(error);
    }
    const { error } = await supabase.rpc("end_pause", { pid: p.id, last_day: actDate });
    done(error);
  };

  const noEnd = async (p: Pause) => {
    setBusy(true);
    const { error } = await supabase.rpc("end_pause", { pid: p.id, last_day: null });
    done(error);
  };

  const cancel = async (p: Pause) => {
    if (!window.confirm("¿Cancelar esta pausa? Es posible solo si empezó hace poco.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_pause", { pid: p.id });
    done(error);
  };

  const line = (p: Pause) => {
    if (p.source === "suspension") return `Medicina suspendida desde el ${formatDate(p.from_date)}. Reactívala desde la Ficha.`;
    const started = p.from_date <= today;
    return `${started ? "En pausa" : "Pausa programada"} desde el ${formatDate(p.from_date)}${
      p.to_date ? ` hasta el ${formatDate(p.to_date)}` : ", sin fecha de fin"
    }.`;
  };

  if (!isFamily && pauses.length === 0) return null;

  return (
    <div className="mt-5 grid gap-3">
      <h3 className="text-sm font-semibold">Pausas</h3>

      {current.length === 0 && <p className="text-sm text-[var(--muted)]">No hay pausas activas ni programadas.</p>}

      <ul className="grid gap-3">
        {current.map((p) => (
          <li key={p.id} className="rounded-xl border border-[var(--border)] p-4">
            <p className="text-sm font-semibold">
              {line(p)}
              {pauseActive(p, today) && p.source === "manual" && (
                <span className="ml-2 rounded-md bg-[var(--sand)] px-2 py-0.5 text-[0.6875rem] text-[var(--sand-text)]">
                  Sin tomas
                </span>
              )}
            </p>
            {isFamily && p.reason && <p className="mt-1 text-xs text-[var(--muted)]">Motivo: {p.reason}</p>}

            {isFamily && p.source === "manual" && act?.id !== p.id && (
              <div className="mt-2 flex flex-wrap gap-1">
                {pauseActive(p, today) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAct({ id: p.id, kind: "resume" });
                      setActDate(today);
                    }}
                    className={small}
                  >
                    Reanudar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAct({ id: p.id, kind: "end" });
                    setActDate(p.to_date && p.to_date >= today ? p.to_date : today);
                  }}
                  className={small}
                >
                  Cambiar fecha de fin
                </button>
                {p.to_date !== null && (
                  <button type="button" onClick={() => noEnd(p)} disabled={busy} className={small}>
                    Sin fecha de fin
                  </button>
                )}
                <button type="button" onClick={() => cancel(p)} disabled={busy} className={small}>
                  Cancelar pausa
                </button>
              </div>
            )}

            {isFamily && act?.id === p.id && (
              <form onSubmit={(e) => submitAct(p, e)} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  {act.kind === "resume" ? "Se reanuda el" : "Último día de pausa"}
                  <input
                    type="date"
                    value={actDate}
                    min={act.kind === "resume" ? addDays(today, -1) : addDays(today, -2)}
                    onChange={(e) => e.target.value && setActDate(e.target.value)}
                    className={input}
                  />
                </label>
                <button type="submit" disabled={busy} className={primary}>
                  {busy ? "Guardando…" : "Guardar"}
                </button>
                <button type="button" onClick={() => setAct(null)} className={ghost}>
                  Cancelar
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {past.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer text-xs font-semibold text-[var(--primary)]">
            Pausas anteriores
          </summary>
          <ul className="mt-1 grid gap-1 text-xs text-[var(--muted)]">
            {past.map((p) => (
              <li key={p.id}>{line(p)}</li>
            ))}
          </ul>
        </details>
      )}

      {isFamily && !creating && (
        <div>
          <button type="button" onClick={() => setCreating(true)} className={ghost}>
            Pausar esta medicina
          </button>
        </div>
      )}

      {isFamily && creating && (
        <form onSubmit={create} className="grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1.5 text-xs font-semibold">
              Desde
              <input
                type="date"
                value={from}
                min={addDays(today, -1)}
                onChange={(e) => e.target.value && setFrom(e.target.value)}
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Hasta (opcional)
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={input} />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Motivo (opcional, solo lo ve la familia)
            <input value={why} onChange={(e) => setWhy(e.target.value)} maxLength={200} className={input} />
          </label>
          <p className="text-xs text-[var(--muted)]">
            Durante la pausa no habrá tomas: no aparecen en Hoy, no cuentan como «sin registrar» y no gastan inventario.
            No se puede pausar hacia atrás de ayer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className={primary}>
              {busy ? "Guardando…" : "Pausar"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className={ghost}>
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
    </div>
  );
}