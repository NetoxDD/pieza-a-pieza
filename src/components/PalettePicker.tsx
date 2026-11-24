import { PALETTES, type Palette } from "@/lib/settings";

export default function PalettePicker({
  value,
  onChange,
}: {
  value: Palette;
  onChange: (p: Palette) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">Estilo de la aplicación</legend>
      <div className="mt-1 grid gap-3 sm:grid-cols-3">
        {PALETTES.map((p) => (
          <label
            key={p.id}
            className={`flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border-2 p-3 transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
              value === p.id
                ? "border-[var(--primary)] bg-[var(--sage)]"
                : "border-[var(--border)] hover:bg-[var(--sage)]"
            }`}
          >
            <input
              type="radio"
              name="palette"
              value={p.id}
              checked={value === p.id}
              onChange={() => onChange(p.id)}
              className="sr-only"
            />
            <span aria-hidden className="flex gap-1.5">
              {p.colors.map((c) => (
                <span key={c} className="h-6 flex-1 rounded-md border border-[var(--border)]" style={{ background: c }} />
              ))}
            </span>
            <span className={`text-sm ${value === p.id ? "font-bold text-[var(--primary)]" : "font-semibold"}`}>
              {p.label}
              {value === p.id && <span className="sr-only"> (elegido)</span>}
            </span>
            <span className="text-xs text-[var(--muted)]">{p.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
