"use client";

import { useState } from "react";

const DECK = [
  { e: "✏️", t: "Tarea" },
  { e: "🧸", t: "Jugar" },
  { e: "🍽️", t: "Comer" },
  { e: "🧼", t: "Lavarme las manos" },
  { e: "🪥", t: "Cepillarme los dientes" },
  { e: "📚", t: "Leer" },
  { e: "🌳", t: "Parque" },
  { e: "🎬", t: "Ver una película" },
  { e: "🎨", t: "Dibujar" },
  { e: "🎵", t: "Música" },
  { e: "😴", t: "Descansar" },
  { e: "🍎", t: "Merienda" },
];

export default function FirstThen() {
  const [first, setFirst] = useState<number | null>(null);
  const [then, setThen] = useState<number | null>(null);
  const [firstDone, setFirstDone] = useState(false);

  const pick = (i: number) => {
    if (first === null) setFirst(i);
    else if (then === null && i !== first) setThen(i);
  };

  const reset = () => {
    setFirst(null);
    setThen(null);
    setFirstDone(false);
  };

  const slot = (label: string, idx: number | null, active: boolean, clear: () => void) => (
    <div
      className={`grid min-h-44 place-items-center gap-2 rounded-3xl border-4 p-4 text-center ${
        active ? "border-[var(--primary)] bg-[var(--sage)]" : "border-[var(--border)] bg-[var(--surface)]"
      }`}
    >
      <p className="text-xl font-bold">{label}</p>
      {idx === null ? (
        <p className="text-base text-[var(--muted)]">Elige una tarjeta</p>
      ) : (
        <button type="button" onClick={clear} aria-label={`Quitar ${DECK[idx].t}`} className="grid place-items-center gap-1">
          <span aria-hidden className="text-6xl">
            {DECK[idx].e}
          </span>
          <span className="text-xl font-semibold">{DECK[idx].t}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="grid gap-6">
      <h1 className="text-4xl font-bold">Primero… Después…</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        {slot("Primero", first, !firstDone, () => {
          setFirst(null);
          setFirstDone(false);
        })}
        {slot("Después", then, firstDone, () => setThen(null))}
      </div>

      {first !== null && then !== null && !firstDone && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setFirstDone(true)}
            className="min-h-16 rounded-2xl bg-[var(--primary)] px-10 text-2xl font-bold text-[var(--on-primary)]"
          >
            Ya terminé el primero ✓
          </button>
        </div>
      )}

      {firstDone && then !== null && (
        <p role="status" className="rounded-3xl bg-[var(--sage)] p-5 text-center text-3xl font-bold text-[var(--primary)]">
          ¡Ahora toca: {DECK[then].t.toLowerCase()}! {DECK[then].e}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" role="group" aria-label="Tarjetas">
        {DECK.map((c, i) => {
          const used = i === first || i === then;
          return (
            <button
              key={c.t}
              type="button"
              onClick={() => pick(i)}
              disabled={used}
              className="grid min-h-28 place-items-center gap-1 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] p-2 hover:bg-[var(--sage)] disabled:opacity-40"
            >
              <span aria-hidden className="text-4xl">
                {c.e}
              </span>
              <span className="text-sm font-semibold">{c.t}</span>
            </button>
          );
        })}
      </div>

      <div>
        <button
          type="button"
          onClick={reset}
          className="min-h-12 rounded-2xl border-2 border-[var(--border)] px-6 text-lg font-semibold hover:bg-[var(--sage)]"
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}