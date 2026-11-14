"use client";

import { MAX_TAGS, TAGS, tagLabel } from "@/lib/observations";

export default function TagPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const full = value.length >= MAX_TAGS;
  return (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-semibold">
        Etiquetas (opcional, hasta {MAX_TAGS})
      </legend>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((t) => {
          const on = value.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => onChange(on ? value.filter((x) => x !== t) : [...value, t])}
              className={`min-h-11 rounded-full border px-4 text-xs font-semibold transition disabled:opacity-40 ${
                on
                  ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
                  : "border-[var(--border)] hover:bg-[var(--sage)]"
              }`}
            >
              {tagLabel(t)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}