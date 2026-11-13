"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { KID_MOODS } from "@/lib/kids";

export default function KidFeelings() {
  const { child } = useChild();
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (picked === null) return;
    setSaving(true);
    setError("");
    const { error } = await supabase
      .from("mood_logs")
      .insert({ child_id: child.id, mood: KID_MOODS[picked].mood });
    setSaving(false);
    if (error) {
      setError("No se pudo guardar. Pide ayuda a un adulto.");
      return;
    }
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="grid gap-6 text-center">
        <p role="status" className="text-4xl font-bold">
          ¡Gracias por contármelo! 💛
        </p>
        <div>
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setPicked(null);
            }}
            className="min-h-14 rounded-2xl border-2 border-[var(--border)] px-8 text-xl font-semibold hover:bg-[var(--sage)]"
          >
            Elegir otra vez
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-4xl font-bold">¿Cómo me siento?</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" role="group" aria-label="Cómo me siento">
        {KID_MOODS.map((m, i) => (
          <button
            key={m.mood}
            type="button"
            onClick={() => setPicked(i)}
            aria-pressed={picked === i}
            className={`grid min-h-36 place-items-center gap-1 rounded-3xl border-4 p-4 ${
              picked === i
                ? "border-[var(--primary)] bg-[var(--sage)]"
                : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--sage)]"
            }`}
          >
            <span aria-hidden className="text-6xl">
              {m.emoji}
            </span>
            <span className="text-xl font-bold">{m.label}</span>
          </button>
        ))}
      </div>

      {picked !== null && (
        <div className="grid gap-3 text-center">
          <p className="text-2xl font-semibold" aria-live="polite">
            Me siento {KID_MOODS[picked].label.toLowerCase()}
          </p>
          <div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="min-h-16 rounded-2xl bg-[var(--primary)] px-10 text-2xl font-bold text-[var(--on-primary)] disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Listo ✓"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-lg font-semibold text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}