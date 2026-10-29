"use client";



import { useChild } from "@/components/ChildGate";
import { useState } from "react";

const moods = [
  { emoji: "😊", label: "Contento" },
  { emoji: "😌", label: "Tranquilo" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "😣", label: "Incómodo" },
  { emoji: "😢", label: "Triste" },
  { emoji: "😠", label: "Frustrado" },
];

const context = ["Casa", "Escuela", "Terapia", "Calle"];

export default function QuickLog() {
  const [mood, setMood] = useState<string | null>(null);
  const [where, setWhere] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { child } = useChild();

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setMood(null);
      setWhere(null);
    }, 2200);
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">¿Cómo está {child.name} ahora?</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Un registro rápido en pocos segundos.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {moods.map((m) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setMood(m.label)}
            aria-pressed={mood === m.label}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition ${
              mood === m.label
                ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
                : "border-[var(--border)] hover:bg-[var(--sage)]"
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {m.emoji}
            </span>
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Lugar">
        {context.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setWhere(c)}
            aria-pressed={where === c}
            className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
              where === c
                ? "border-[var(--blue-text)] bg-[var(--blue)] text-[var(--blue-text)]"
                : "border-[var(--border)] hover:bg-[var(--blue)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!mood}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar registro
        </button>
        {saved && (
          <p role="status" className="text-sm font-medium text-[var(--primary)]">
            ✓ Registro guardado (demostración)
          </p>
        )}
      </div>
    </section>
  );
}