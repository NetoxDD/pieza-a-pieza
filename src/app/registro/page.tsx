"use client";

import { useState } from "react";
import { Check } from "lucide-react";

type Tag = "Comunicación" | "Apoyos sensoriales" | "Rutinas" | "Disfrute";

type Observation = {
  id: number;
  author: string;
  date: string;
  text: string;
  tag: Tag;
};

const tags: Tag[] = ["Comunicación", "Apoyos sensoriales", "Rutinas", "Disfrute"];

const tagStyle: Record<Tag, string> = {
  Comunicación: "bg-[var(--sage)] text-[var(--primary)]",
  "Apoyos sensoriales": "bg-[var(--blue)] text-[var(--blue-text)]",
  Rutinas: "bg-[var(--sand)] text-[#74613d]",
  Disfrute: "bg-[var(--sage)] text-[var(--primary)]",
};

const authors = [
  "Clara López · Familia",
  "Diego Santos · Tutor",
  "Ana Ruiz · Logopeda",
  "Lucía Martín · Terapeuta ocupacional",
];

const routines = [
  { time: "08:00", title: "Prepararnos para salir", detail: "Secuencia visual · Elegir la chaqueta", badge: "Con apoyo visual" },
  { time: "14:00", title: "Comer y descansar", detail: "Ambiente tranquilo · Respetar sus tiempos", badge: "A su ritmo" },
  { time: "17:30", title: "Un cuento compartido", detail: "Dos opciones · Esperar su elección", badge: "Prevista" },
  { time: "20:00", title: "Preparar el descanso", detail: "Luz suave · Anticipar los pasos", badge: "Prevista" },
];

const initialObservations: Observation[] = [
  {
    id: 1,
    author: "Clara López · Familia",
    date: "23 oct · 08:45",
    text: "Al salir de casa, Mateo señaló el parque en su tablero. Cambiamos la ruta y disfrutó el paseo. Le ayudó poder elegir antes de salir.",
    tag: "Comunicación",
  },
  {
    id: 2,
    author: "Lucía Martín · Terapeuta ocupacional",
    date: "23 oct · 12:15",
    text: "En el aula buscó el rincón tranquilo al aumentar el ruido. Con los auriculares, eligió volver a la actividad de dibujo.",
    tag: "Apoyos sensoriales",
  },
];

export default function Registro() {
  const [done, setDone] = useState<number[]>([0]);
  const [observations, setObservations] = useState(initialObservations);
  const [filter, setFilter] = useState<Tag | "Todas">("Todas");

  const [author, setAuthor] = useState(authors[0]);
  const [tag, setTag] = useState<Tag>("Comunicación");
  const [text, setText] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const toggleRoutine = (i: number) =>
    setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const date = new Date().toLocaleString("es-MX", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setObservations((o) => [{ id: Date.now(), author, date, text: text.trim(), tag }, ...o]);
    setText("");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  const visible = observations.filter((o) => filter === "Todas" || o.tag === filter);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cada día nos cuenta algo</h1>
        <p className="mt-1 text-[var(--muted)]">
          Rutinas flexibles y observaciones para descubrir qué le ayuda.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          {/* Rutinas */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Las rutinas del día</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Una guía, no una lista de exigencias. Podemos cambiar el plan.
            </p>
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {routines.map((r, i) => {
                const isDone = done.includes(i);
                return (
                  <li key={r.time} className="flex items-start gap-4 py-4">
                    <time className="w-12 pt-1 text-xs text-[var(--muted)]">{r.time}</time>
                    <div className="min-w-0 flex-1">
                      <h3 className={`font-semibold ${isDone ? "text-[var(--muted)] line-through" : ""}`}>
                        {r.title}
                      </h3>
                      <p className="text-xs text-[var(--muted)]">{r.detail}</p>
                      <span className="mt-2 inline-block rounded-md bg-[var(--blue)] px-2.5 py-1 text-[11px] font-semibold text-[var(--blue-text)]">
                        {r.badge}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRoutine(i)}
                      aria-pressed={isDone}
                      aria-label={`Marcar "${r.title}" como realizada`}
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition ${
                        isDone
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] text-transparent hover:bg-[var(--sage)]"
                      }`}
                    >
                      <Check size={18} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Observaciones */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Observaciones compartidas</h2>

            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
              {(["Todas", ...tags] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilter(t)}
                  aria-pressed={filter === t}
                  className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
                    filter === t
                      ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
                      : "border-[var(--border)] hover:bg-[var(--sage)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <ul className="mt-2 divide-y divide-[var(--border)]">
              {visible.length === 0 && (
                <li className="py-6 text-sm text-[var(--muted)]">
                  Aún no hay observaciones en esta categoría.
                </li>
              )}
              {visible.map((o) => (
                <li key={o.id} className="py-5">
                  <strong className="text-sm">{o.author}</strong>
                  <small className="block text-xs text-[var(--muted)]">{o.date}</small>
                  <p className="mt-2 text-sm">{o.text}</p>
                  <span className={`mt-3 inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold ${tagStyle[o.tag]}`}>
                    {o.tag}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Formulario */}
        <div className="grid gap-6">
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Añadir observación</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Lo que ocurrió, el contexto y lo que ayudó.
              </p>
            </div>

            <label className="grid gap-1.5 text-xs font-semibold">
              ¿Quién escribe?
              <select
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
              >
                {authors.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold">
              Categoría
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value as Tag)}
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
              >
                {tags.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1.5 text-xs font-semibold">
              ¿Qué te gustaría compartir?
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={2000}
                placeholder="Describe lo ocurrido y qué ayudó…"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
              />
            </label>

            <small className="text-xs text-[var(--muted)]">
              Demostración: la información se pierde al recargar la página.
            </small>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!text.trim()}
                className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Publicar
              </button>
              {justAdded && (
                <p role="status" className="text-sm font-medium text-[var(--primary)]">
                  ✓ Observación añadida
                </p>
              )}
            </div>
          </form>

          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[#74613d]">
            También puedes registrar un disfrute, una elección o algo que hoy no funcionó.
          </div>
        </div>
      </div>
    </div>
  );
}