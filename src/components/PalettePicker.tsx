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
      <legend className="text-sm font-semibold">Paleta de colores</legend>
      <div className="mt-1 flex flex-wrap gap-2">
        {PALETTES.map((p) => (
          <label
            key={p.id}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
              value === p.id
                ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
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
            <span
              aria-hidden
              className="h-5 w-5 shrink-0 rounded-full border border-[var(--border)]"
              style={{ background: p.swatch }}
            />
            {p.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}