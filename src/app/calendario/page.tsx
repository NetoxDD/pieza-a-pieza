"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { localDate } from "@/lib/routines";
import {
  EV_COLS,
  MAX_EVERY,
  WD,
  buildIcs,
  downloadText,
  evError,
  fetchOccurrences,
  isoDow,
  repeatText,
  type EvRow,
  type Occ,
  type RepeatKind,
} from "@/lib/events";

type Pt = [number, number];
type Side = "t" | "r" | "b" | "l";
type Signs = { top: number; right: number; bottom: number; left: number };

/* ---------- Colores de las piezas (vienen del tema) ---------- */
const FILL = {
  base: "var(--piece-base)",
  today: "var(--piece-today)",
  event: "var(--piece-event)",
  selected: "var(--piece-selected)",
};
const TEXT = {
  base: "var(--piece-base-text)",
  today: "var(--piece-today-text)",
  event: "var(--piece-event-text)",
  selected: "var(--piece-selected-text)",
};

/* ---------- Forma de una pestaña de rompecabezas ---------- */
const BASE: { c?: [Pt, Pt]; p: Pt }[] = [
  { p: [38, 0] },
  { c: [[38, 5], [32, 7]], p: [32, 14] },
  { c: [[32, 21], [40, 24]], p: [50, 24] },
  { c: [[60, 24], [68, 21]], p: [68, 14] },
  { c: [[68, 7], [62, 5]], p: [62, 0] },
  { p: [100, 0] },
];

function map(side: Side, [u, v]: Pt): Pt {
  switch (side) {
    case "t": return [u, -v];
    case "r": return [100 + v, u];
    case "b": return [100 - u, 100 + v];
    case "l": return [-v, 100 - u];
  }
}

function edge(side: Side, sign: number): string {
  if (sign === 0) {
    const end = map(side, [100, 0]);
    return `L${end[0]} ${end[1]}`;
  }
  const m = (pt: Pt) => map(side, [pt[0], pt[1] * sign]);
  return BASE.map((s) => {
    if (s.c) {
      const [a, b] = s.c.map(m);
      const p = m(s.p);
      return `C${a[0]} ${a[1]} ${b[0]} ${b[1]} ${p[0]} ${p[1]}`;
    }
    const p = m(s.p);
    return `L${p[0]} ${p[1]}`;
  }).join(" ");
}

function piecePath(s: Signs) {
  return `M0 0 ${edge("t", s.top)} ${edge("r", s.right)} ${edge("b", s.bottom)} ${edge("l", s.left)} Z`;
}

const signRight = (r: number, c: number) => ((r + c) % 2 === 0 ? 1 : -1);
const signBottom = (r: number, c: number) => ((r + c) % 2 === 0 ? -1 : 1);

function signsFor(day: number, offset: number, total: number): Signs {
  const i = offset + day - 1;
  const row = Math.floor(i / 7);
  const col = i % 7;
  return {
    right: col < 6 && day < total ? signRight(row, col) : 0,
    left: col > 0 && day > 1 ? -signRight(row, col - 1) : 0,
    bottom: day + 7 <= total ? signBottom(row, col) : 0,
    top: day - 7 >= 1 ? -signBottom(row - 1, col) : 0,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const addDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + n));
};
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--surface)] disabled:opacity-60";
const small =
  "min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--primary)] disabled:opacity-40";

export default function Calendario() {
  const { child, userId, role } = useChild();
  const isFamily = role === "familia";
  const now = new Date();

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(now.getDate());
  const [occs, setOccs] = useState<Occ[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  // Nuevo encuentro
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [detail, setDetail] = useState("");
  const [repeat, setRepeat] = useState<RepeatKind>("none");
  const [everyStr, setEveryStr] = useState("1");
  const [days, setDays] = useState<number[]>([]);
  const [until, setUntil] = useState("");
  const [saving, setSaving] = useState(false);

  // Edición, borrado y exportación
  const [editing, setEditing] = useState<{ id: string; title: string; time: string; detail: string } | null>(null);
  const [delFor, setDelFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [alarm, setAlarm] = useState(false);

  const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
  const selDate = iso(cursor.y, cursor.m, selected);

  const load = useCallback(async () => {
    const rows = await fetchOccurrences(child.id, iso(cursor.y, cursor.m, 1), iso(cursor.y, cursor.m, total));
    if (!rows) setError("No se pudo cargar el calendario.");
    else {
      setError("");
      setOccs(rows);
    }
  }, [child.id, cursor.y, cursor.m, total]);

  useEffect(() => {
    load();
  }, [load]);

  const go = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    const current = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(current ? now.getDate() : 1);
    setShowForm(false);
    setEditing(null);
    setDelFor(null);
  };

  const counts: Record<number, number> = {};
  occs.forEach((e) => {
    const d = Number(e.occ_date.slice(8, 10));
    counts[d] = (counts[d] ?? 0) + 1;
  });

  const dayOccs = occs.filter((e) => Number(e.occ_date.slice(8, 10)) === selected);
  const selectedLabel = new Date(cursor.y, cursor.m, selected).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const maxEvery = repeat === "none" ? 1 : MAX_EVERY[repeat];
  const every = Math.max(1, Math.min(maxEvery, Math.floor(Number(everyStr)) || 1));
  const effDays = days.length ? days : [isoDow(selDate)];
  const toggleDay = (d: number) =>
    setDays(effDays.includes(d) ? effDays.filter((x) => x !== d) : [...effDays, d].sort());

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    if (repeat !== "none" && effDays.length === 0) return;
    setSaving(true);
    setError("");
    const { error } = await supabase.from("events").insert({
      child_id: child.id,
      event_date: selDate,
      event_time: time || null,
      title: clean,
      detail: detail.trim() || null,
      repeat_kind: repeat,
      repeat_every: repeat === "none" ? 1 : every,
      repeat_days: repeat === "weekly" ? effDays : [],
      repeat_until: repeat === "none" ? null : until || null,
    });
    setSaving(false);
    if (error) {
      setError(evError(error, "No se pudo guardar el encuentro. Intenta de nuevo."));
      return;
    }
    setTitle("");
    setTime("");
    setDetail("");
    setRepeat("none");
    setEveryStr("1");
    setDays([]);
    setUntil("");
    setShowForm(false);
    load();
  };

  const act = async (run: () => PromiseLike<{ error: { message?: string } | null }>, fail: string) => {
    setBusy(true);
    setError("");
    const { error } = await run();
    setBusy(false);
    if (error) {
      setError(evError(error, fail));
      return false;
    }
    setDelFor(null);
    setEditing(null);
    load();
    return true;
  };

  const saveEdit = () => {
    if (!editing || !editing.title.trim()) return;
    return act(
      () =>
        supabase.rpc("update_event", {
          eid: editing.id,
          p_title: editing.title,
          p_time: editing.time || null,
          p_detail: editing.detail || null,
        }),
      "No se pudo guardar."
    );
  };

  const deleteAll = (o: Occ) => {
    const msg =
      o.repeat_kind === "none" ? "¿Eliminar este encuentro?" : "¿Eliminar TODA la serie, con todos sus días?";
    if (!window.confirm(msg)) return;
    return act(() => supabase.from("events").delete().eq("id", o.event_id), "No se pudo eliminar.");
  };

  const skipDay = (o: Occ) =>
    act(() => supabase.rpc("skip_event_occurrence", { eid: o.event_id, d: o.occ_date }), "No se pudo quitar ese día.");

  const endFrom = (o: Occ) =>
    act(
      () => supabase.rpc("end_event_series", { eid: o.event_id, last_day: addDays(o.occ_date, -1) }),
      "No se pudo terminar la serie."
    );

  // ---------- Exportar ----------
  const logExport = () =>
    supabase.rpc("log_export", { cid: child.id, kind: "calendario" }).then(
      () => {},
      () => {}
    );

  const exportSeries = async (o: Occ) => {
    setNote("");
    setError("");
    const [ev, ex] = await Promise.all([
      supabase.from("events").select(EV_COLS).eq("id", o.event_id).single(),
      supabase.from("event_exceptions").select("event_id,occ_date").eq("event_id", o.event_id),
    ]);
    if (ev.error || !ev.data) {
      setError("No se pudo preparar el archivo.");
      return;
    }
    downloadText(
      buildIcs([ev.data as EvRow], (ex.data ?? []) as { event_id: string; occ_date: string }[], { alarm }),
      `encuentro-${o.series_start}.ics`
    );
    logExport();
    setNote("Se descargó el archivo. Ábrelo para añadirlo a tu calendario.");
  };

  const exportAll = async () => {
    setNote("");
    setError("");
    const [ev, ex] = await Promise.all([
      supabase.from("events").select(EV_COLS).eq("child_id", child.id).order("event_date").limit(1000),
      supabase.from("event_exceptions").select("event_id,occ_date").eq("child_id", child.id).limit(5000),
    ]);
    if (ev.error || !ev.data) {
      setError("No se pudo preparar el archivo.");
      return;
    }
    downloadText(
      buildIcs(ev.data as EvRow[], (ex.data ?? []) as { event_id: string; occ_date: string }[], { alarm }),
      `pieza-a-pieza-calendario-${localDate()}.ics`
    );
    logExport();
    setNote(`Se descargó el calendario con ${ev.data.length} ${ev.data.length === 1 ? "encuentro" : "encuentros"}.`);
  };

  const chip = (active: boolean) =>
    `flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-3 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] text-[var(--muted)]"
    }`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario compartido</h1>
          <p className="mt-1 text-[var(--muted)]">Cada día es una pieza. Juntas arman el mes del equipo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowExport((s) => !s)}
            aria-expanded={showExport}
            className={ghost}
          >
            Exportar (.ics)
          </button>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className={primary}
          >
            + Nuevo encuentro
          </button>
        </div>
      </div>

      {showExport && (
        <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-semibold">Llevar el calendario a tu teléfono o computadora</h2>
          <p className="text-sm text-[var(--muted)]">
            Descarga un archivo .ics y ábrelo: Google Calendar, Apple Calendario y Outlook lo entienden. Los
            encuentros que se repiten llegan como serie. Los que tienen hora duran 1 hora.
          </p>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={alarm}
              onChange={(e) => setAlarm(e.target.checked)}
              className="h-4 w-4 shrink-0 accent-[var(--primary)]"
            />
            Añadir un recordatorio 30 minutos antes (en los encuentros con hora)
          </label>
          <div>
            <button type="button" onClick={exportAll} className={ghost}>
              <Download size={16} aria-hidden className="mr-2 inline" />
              Descargar todo el calendario
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            El archivo no está cifrado y contiene los títulos y detalles de los encuentros: guárdalo con cuidado.
            Cada exportación queda anotada en el historial.
          </p>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold first-letter:uppercase">{monthName}</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Mes anterior"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Mes siguiente"
                className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 text-center text-xs font-semibold text-[var(--muted)]">
            {weekdays.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 px-1 pb-1">
            {Array.from({ length: offset }, (_, i) => (
              <div key={`b${i}`} aria-hidden />
            ))}

            {Array.from({ length: total }, (_, k) => k + 1).map((day) => {
              const isSel = day === selected;
              const n = counts[day] ?? 0;
              const has = n > 0;
              const isToday = isCurrentMonth && day === now.getDate();
              const state = isSel ? "selected" : has ? "event" : isToday ? "today" : "base";

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setSelected(day);
                    setDelFor(null);
                    setEditing(null);
                  }}
                  aria-pressed={isSel}
                  aria-label={`${day} de ${monthName}${isToday ? ", hoy" : ""}${
                    has ? `, ${n} ${n === 1 ? "encuentro" : "encuentros"}` : ""
                  }`}
                  className={`group relative aspect-square w-full focus-visible:z-20 ${isSel ? "z-10" : "hover:z-10"}`}
                >
                  <svg
                    viewBox="0 0 100 100"
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-transform duration-200 motion-reduce:transition-none ${
                      isSel ? "scale-[1.07]" : "group-hover:scale-[1.03]"
                    }`}
                    style={{ filter: isSel ? "drop-shadow(0 4px 6px rgba(37,61,54,0.3))" : undefined }}
                  >
                    <path
                      d={piecePath(signsFor(day, offset, total))}
                      className="transition-[fill] duration-200 motion-reduce:transition-none"
                      style={{ fill: FILL[state], stroke: "var(--surface)", strokeWidth: 3 }}
                      vectorEffect="non-scaling-stroke"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <span
                    className={`relative grid h-full place-items-center text-sm font-bold sm:text-base ${
                      isToday ? "underline decoration-2 underline-offset-4" : ""
                    }`}
                    style={{ color: TEXT[state] }}
                  >
                    {day}
                  </span>

                  {has && (
                    <span
                      aria-hidden
                      className="absolute bottom-[16%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
                      style={{ background: isSel ? FILL.event : "var(--piece-dot)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: FILL.selected }} /> Día elegido
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: FILL.event }} /> Con encuentro
            </li>
            <li className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: FILL.today }} /> Hoy
            </li>
          </ul>
        </section>

        <aside className="grid gap-6">
          <section className="rounded-2xl bg-[var(--blue)] p-6" aria-live="polite">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{selectedLabel}</p>

            {dayOccs.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No hay encuentros este día.</p>
            ) : (
              <ul className="mt-3 grid gap-5">
                {dayOccs.map((o) => {
                  const key = `${o.event_id}-${o.occ_date}`;
                  const canEdit = o.created_by === userId || isFamily;
                  const recurring = o.repeat_kind !== "none";
                  const isEditing = editing?.id === o.event_id;

                  return (
                    <li key={key} className="grid gap-2">
                      {isEditing && editing ? (
                        <div className="grid gap-3 rounded-xl bg-[var(--surface)] p-4">
                          <label className="grid gap-1.5 text-xs font-semibold">
                            Título
                            <input
                              value={editing.title}
                              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                              maxLength={120}
                              className={input}
                            />
                          </label>
                          <label className="grid gap-1.5 text-xs font-semibold">
                            Hora (opcional)
                            <input
                              type="time"
                              value={editing.time}
                              onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                              className={input}
                            />
                          </label>
                          <label className="grid gap-1.5 text-xs font-semibold">
                            Detalle (opcional)
                            <textarea
                              value={editing.detail}
                              onChange={(e) => setEditing({ ...editing, detail: e.target.value })}
                              maxLength={500}
                              rows={3}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
                            />
                          </label>
                          {recurring && (
                            <p className="text-xs text-[var(--muted)]">El cambio vale para todos los días de la serie.</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={saveEdit} disabled={busy || !editing.title.trim()} className={primary}>
                              {busy ? "Guardando…" : "Guardar"}
                            </button>
                            <button type="button" onClick={() => setEditing(null)} className={ghost}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{o.title}</h2>
                          <p className="text-sm font-semibold">{o.event_time ?? "Hora por confirmar"}</p>
                          {recurring && (
                            <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--muted)]">
                              <Repeat size={14} aria-hidden className="mt-0.5 shrink-0" />
                              {repeatText(o.repeat_kind, o.repeat_every, o.repeat_days, o.repeat_until, o.series_start)}
                            </p>
                          )}
                          {o.detail && (
                            <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{o.detail}</p>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex flex-wrap gap-1">
                          <button type="button" onClick={() => exportSeries(o)} className={small}>
                            <Download size={14} aria-hidden className="mr-1 inline" />
                            Añadir a mi calendario
                          </button>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setDelFor(null);
                                  setEditing({ id: o.event_id, title: o.title, time: o.event_time ?? "", detail: o.detail ?? "" });
                                }}
                                className={small}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => (recurring ? setDelFor(delFor === key ? null : key) : deleteAll(o))}
                                aria-expanded={recurring ? delFor === key : undefined}
                                className={small}
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {canEdit && recurring && delFor === key && (
                        <div className="grid gap-2 rounded-xl bg-[var(--surface)] p-4">
                          <p className="text-xs font-semibold">¿Qué quieres eliminar?</p>
                          <button type="button" onClick={() => skipDay(o)} disabled={busy} className={ghost}>
                            Solo este día
                          </button>
                          {o.occ_date > o.series_start && (
                            <button type="button" onClick={() => endFrom(o)} disabled={busy} className={ghost}>
                              Este día y los siguientes
                            </button>
                          )}
                          <button type="button" onClick={() => deleteAll(o)} disabled={busy} className={ghost}>
                            Toda la serie
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {showForm && (
              <form onSubmit={addEvent} className="mt-5 grid gap-3 rounded-xl bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--muted)]">Nuevo encuentro para este día.</p>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Título
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="Ej. Reunión con el tutor"
                    className={input}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Hora (opcional)
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={input} />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold">
                  Se repite
                  <select
                    value={repeat}
                    onChange={(e) => {
                      setRepeat(e.target.value as RepeatKind);
                      setEveryStr("1");
                    }}
                    className={input}
                  >
                    <option value="none">No se repite</option>
                    <option value="daily">Cada cierto número de días</option>
                    <option value="weekly">Cada cierto número de semanas</option>
                    <option value="monthly">Cada cierto número de meses</option>
                  </select>
                </label>

                {repeat !== "none" && (
                  <>
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Cada cuántos {repeat === "daily" ? "días" : repeat === "weekly" ? "semanas" : "meses"}
                      <input
                        type="number"
                        min={1}
                        max={maxEvery}
                        value={everyStr}
                        onChange={(e) => setEveryStr(e.target.value)}
                        className={`${input} w-28`}
                      />
                    </label>

                    {repeat === "weekly" && (
                      <fieldset>
                        <legend className="text-xs font-semibold">Los días</legend>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {WD.map((label, i) => (
                            <label key={label} className={chip(effDays.includes(i + 1))}>
                              <input
                                type="checkbox"
                                checked={effDays.includes(i + 1)}
                                onChange={() => toggleDay(i + 1)}
                                className="sr-only"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}

                    <label className="grid gap-1.5 text-xs font-semibold">
                      Termina el (opcional)
                      <input type="date" value={until} min={selDate} onChange={(e) => setUntil(e.target.value)} className={input} />
                    </label>

                    <p className="text-xs text-[var(--muted)]">
                      Se repetirá:{" "}
                      {repeatText(repeat, every, repeat === "weekly" ? effDays : [], until || null, selDate)}.
                      {repeat === "monthly" && " Si un mes no tiene ese día, ese mes se omite."}
                    </p>
                  </>
                )}

                <label className="grid gap-1.5 text-xs font-semibold">
                  Detalle (opcional)
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
                  />
                </label>
                <button type="submit" disabled={!title.trim() || saving} className={primary}>
                  {saving ? "Guardando…" : "Añadir al calendario"}
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}
            {note && (
              <p role="status" className="mt-3 text-sm text-[var(--muted)]">
                {note}
              </p>
            )}
          </section>

          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
            Antes del encuentro, puedes compartir en el registro lo que te gustaría comentar.
          </div>
        </aside>
      </div>
    </div>
  );
}