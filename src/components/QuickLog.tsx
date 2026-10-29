"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

const moods = [
  { emoji: "😊", label: "Contento" },
  { emoji: "😌", label: "Tranquilo" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "😣", label: "Incómodo" },
  { emoji: "😢", label: "Triste" },
  { emoji: "😠", label: "Frustrado" },
];

const places = ["Casa", "Escuela", "Terapia", "Calle"];

export default function QuickLog({ onSaved }: { onSaved?: () => void }) {
  const { child } = useChild();
  const [mood, setMood] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!mood) return;
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("mood_logs")
      .insert({ child_id: child.id, mood, place });
    setSaving(false);

    if (error) {
      setError("No se pudo guardar el registro. Intenta de nuevo.");
      return;
    }
    setSaved(true);
    setMood(null);
    setPlace(null);
    onSaved?.();
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">¿Cómo está {child.name} ahora?</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Un registro rápido en pocos segundos.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6" role="group" aria-label="Estado de ánimo">
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
        {places.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlace(place === p ? null : p)}
            aria-pressed={place === p}
            className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
              place === p
                ? "border-[var(--blue-text)] bg-[var(--blue)] text-[var(--blue-text)]"
                : "border-[var(--border)] hover:bg-[var(--blue)]"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!mood || saving}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar registro"}
        </button>
        {saved && (
          <p role="status" className="text-sm font-medium text-[var(--primary)]">
            ✓ Registro guardado
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}