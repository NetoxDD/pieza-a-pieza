"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

type Ev = {
  id: string;
  event_date: string;
  event_time: string | null;
  title: string;
  detail: string | null;
  created_by: string;
};

type Pt = [number, number];
type Side = "t" | "r" | "b" | "l";
type Signs = { top: number; right: number; bottom: number; left: number };

/* ---------- Colores de las piezas (cámbialos aquí) ---------- */
const FILL = {
  base: "#e7f0e6",
  today: "#d3e4ec",
  event: "#ecd9a0",
  selected: "#426f5d",
};
const TEXT = {
  base: "#253d36",
  today: "#2f4a5c",
  event: "#5a4a1f",
  selected: "#ffffff",
};

/* ---------- Forma de una pestaña de rompecabezas ----------
   Coordenadas locales: u va a lo largo del borde (0 a 100),
   v es la altura de la pestaña hacia afuera. Para cambiar el tamaño
   de las pestañas, ajusta los valores 24, 21, 14, etc. */
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

/* Hacia dónde sale (+1) o entra (-1) la pestaña de cada lado.
   Cada pieza usa el signo contrario al de su vecina, así encajan. */
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
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default function Calendario() {
  const { child, userId } = useChild();
  const now = new Date();

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState(now.getDate());
  const [events, setEvents] = useState<Ev[]>([]);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);

  const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const offset = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();
  const monthName = new Date(cursor.y, cursor.m, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });

  const load = useCallback(async () => {
    const from = iso(cursor.y, cursor.m, 1);
    const next = new Date(cursor.y, cursor.m + 1, 1);
    const to = iso(next.getFullYear(), next.getMonth(), 1);

    const { data, error } = await supabase
      .from("events")
      .select("id,event_date,event_time,title,detail,created_by")
      .eq("child_id", child.id)
      .gte("event_date", from)
      .lt("event_date", to)
      .order("event_date")
      .order("event_time", { ascending: true, nullsFirst: false });

    if (error) setError("No se pudo cargar el calendario.");
    else {
      setError("");
      setEvents(data as Ev[]);
    }
  }, [child.id, cursor.y, cursor.m]);

  useEffect(() => {
    load();
  }, [load]);

  const go = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    const current = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(current ? now.getDate() : 1);
    setShowForm(false);
  };

  const counts: Record<number, number> = {};
  events.forEach((e) => {
    const d = Number(e.event_date.slice(8, 10));
    counts[d] = (counts[d] ?? 0) + 1;
  });

  const dayEvents = events.filter((e) => Number(e.event_date.slice(8, 10)) === selected);
  const selectedLabel = new Date(cursor.y, cursor.m, selected).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    setSaving(true);
    setError("");
    const { error } = await supabase.from("events").insert({
      child_id: child.id,
      event_date: iso(cursor.y, cursor.m, selected),
      event_time: time || null,
      title: clean,
      detail: detail.trim() || null,
    });
    setSaving(false);
    if (error) {
      setError("No se pudo guardar el encuentro. Intenta de nuevo.");
      return;
    }
    setTitle("");
    setTime("");
    setDetail("");
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este encuentro?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setError("No se pudo eliminar.");
    else load();
  };

  const input =
    "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario compartido</h1>
          <p className="mt-1 text-[var(--muted)]">
            Cada día es una pieza. Juntas arman el mes del equipo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          aria-expanded={showForm}
          className="min-h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        >
          + Nuevo encuentro
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold capitalize">{monthName}</h2>
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
                  onClick={() => setSelected(day)}
                  aria-pressed={isSel}
                  aria-label={`${day} de ${monthName}${isToday ? ", hoy" : ""}${
                    has ? `, ${n} ${n === 1 ? "encuentro" : "encuentros"}` : ""
                  }`}
                  className={`group relative aspect-square w-full focus-visible:z-20 ${
                    isSel ? "z-10" : "hover:z-10"
                  }`}
                >
                  <svg
                    viewBox="0 0 100 100"
                    aria-hidden
                    className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible transition-transform duration-200 motion-reduce:transition-none ${
                      isSel ? "scale-[1.07]" : "group-hover:scale-[1.03]"
                    }`}
                    style={{
                      filter: isSel ? "drop-shadow(0 4px 6px rgba(37,61,54,0.3))" : undefined,
                    }}
                  >
                    <path
                      d={piecePath(signsFor(day, offset, total))}
                      className="transition-[fill] duration-200 motion-reduce:transition-none"
                      style={{ fill: FILL[state], stroke: "#ffffff", strokeWidth: 3 }}
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
                      style={{ background: isSel ? FILL.event : "#8a6d1f" }}
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
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
              {selectedLabel}
            </p>

            {dayEvents.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No hay encuentros este día.</p>
            ) : (
              <ul className="mt-3 grid gap-4">
                {dayEvents.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{e.title}</h2>
                      <p className="text-sm font-semibold">
                        {e.event_time ? e.event_time.slice(0, 5) : "Hora por confirmar"}
                      </p>
                      {e.detail && (
                        <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">
                          {e.detail}
                        </p>
                      )}
                    </div>
                    {e.created_by === userId && (
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--primary)]"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                ))}
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
                  Detalle (opcional)
                  <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Añadir al calendario"}
                </button>
              </form>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>

          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[#74613d]">
            Antes del encuentro, puedes compartir en el registro lo que te gustaría comentar.
          </div>
        </aside>
      </div>
    </div>
  );
}