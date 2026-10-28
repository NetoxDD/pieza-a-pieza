"use client";

import { useState } from "react";

type Ev = { id: number; day: number; time: string; title: string; detail: string };

const DAYS_IN_MONTH = 31;
const START_OFFSET = 3; // el 1 de octubre de 2026 cae en jueves (lunes = 0)
const TODAY = 27;
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekdayNames = ["jueves", "viernes", "sábado", "domingo", "lunes", "martes", "miércoles"];

const initialEvents: Ev[] = [
  { id: 1, day: 26, time: "17:00", title: "Revisión de apoyos", detail: "Videollamada · Familia y equipo" },
  { id: 2, day: 30, time: "Por confirmar", title: "Revisión conjunta de objetivos", detail: "Revisar apoyos actuales y prioridades de la familia" },
];

export default function Calendario() {
  const [events, setEvents] = useState(initialEvents);
  const [selected, setSelected] = useState(26);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("17:00");

  const cells: (number | null)[] = [
    ...Array(START_OFFSET).fill(null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1),
  ];

  const dayEvents = events.filter((e) => e.day === selected);
  const dayName = weekdayNames[(selected - 1) % 7];

  const addEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setEvents((ev) => [
      ...ev,
      { id: Date.now(), day: selected, time, title: title.trim(), detail: "Encuentro añadido (demostración)" },
    ]);
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario compartido</h1>
          <p className="mt-1 text-[var(--muted)]">
            Un lugar para organizar encuentros y revisiones del equipo.
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
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Octubre de 2026</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Toca un día para ver sus encuentros.</p>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--muted)] sm:gap-2">
            {weekdays.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-2">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} aria-hidden />;
              const has = events.some((e) => e.day === day);
              const isSel = day === selected;
              const isToday = day === TODAY;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={isSel}
                  aria-label={`${day} de octubre${has ? ", con encuentros" : ""}${isToday ? ", hoy" : ""}`}
                  className={`relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl border text-sm transition sm:aspect-auto sm:h-20 sm:items-start sm:justify-start sm:p-2 ${
                    isSel
                      ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                      : isToday
                      ? "border-[var(--blue-text)] bg-[var(--blue)]"
                      : "border-[var(--border)] hover:bg-[var(--sage)]"
                  }`}
                >
                  {day}
                  {has && (
                    <span
                      aria-hidden
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)] sm:absolute sm:bottom-2 sm:left-2"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-[var(--blue-text)] bg-[var(--blue)]" /> Hoy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" /> Con encuentro
            </span>
          </div>
        </section>

        <aside className="grid gap-6">
          <section className="rounded-2xl bg-[var(--blue)] p-6" aria-live="polite">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
              {dayName} · {selected} de octubre
            </p>

            {dayEvents.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No hay encuentros este día.</p>
            ) : (
              <ul className="mt-3 grid gap-4">
                {dayEvents.map((e) => (
                  <li key={e.id}>
                    <h2 className="text-lg font-semibold">{e.title}</h2>
                    <p className="text-sm font-semibold">{e.time}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{e.detail}</p>
                  </li>
                ))}
              </ul>
            )}

            {showForm && (
              <form onSubmit={addEvent} className="mt-5 grid gap-3 rounded-xl bg-[var(--surface)] p-4">
                <p className="text-xs text-[var(--muted)]">
                  Nuevo encuentro para el {selected} de octubre.
                </p>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Título
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Reunión con el tutor"
                    className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm font-normal"
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Hora
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="min-h-11 rounded-lg border border-[var(--border)] px-3 text-sm font-normal"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white disabled:opacity-50"
                >
                  Añadir al calendario
                </button>
              </form>
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