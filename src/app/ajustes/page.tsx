"use client";

import { useSettings } from "@/components/SettingsProvider";
import type { Settings } from "@/lib/settings";

function Choice<T extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
}: {
  legend: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      <div className="mt-1 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
              value === o.value
                ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                : "border-[var(--border)] hover:bg-[var(--sage)]"
            }`}
          >
            <input
              type="radio"
              name={legend}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Ajustes() {
  const { settings, update, reset } = useSettings();

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-[var(--muted)]">
          Haz la app cómoda para ti. Los cambios se guardan solos y te siguen a otros dispositivos.
        </p>
      </div>

      <section className="grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <Choice<Settings["fontScale"]>
          legend="Tamaño de letra"
          hint="Se suma al tamaño que ya tengas configurado en tu dispositivo."
          value={settings.fontScale}
          options={[
            { value: "normal", label: "Normal" },
            { value: "grande", label: "Grande" },
            { value: "muy-grande", label: "Muy grande" },
          ]}
          onChange={(v) => update({ fontScale: v })}
        />

        <Choice<Settings["font"]>
          legend="Tipo de letra"
          hint="La alta legibilidad distingue mejor las letras parecidas. Ayuda con baja visión y dislexia."
          value={settings.font}
          options={[
            { value: "normal", label: "Estándar" },
            { value: "legible", label: "Alta legibilidad" },
          ]}
          onChange={(v) => update({ font: v })}
        />

        <Choice<Settings["contrast"]>
          legend="Contraste"
          value={settings.contrast}
          options={[
            { value: "normal", label: "Normal" },
            { value: "alto", label: "Alto" },
          ]}
          onChange={(v) => update({ contrast: v })}
        />

        <Choice<Settings["theme"]>
          legend="Tema"
          hint="Automático sigue la configuración de tu dispositivo."
          value={settings.theme}
          options={[
            { value: "claro", label: "Claro" },
            { value: "oscuro", label: "Oscuro" },
            { value: "auto", label: "Automático" },
          ]}
          onChange={(v) => update({ theme: v })}
        />

        <Choice<"si" | "no">
          legend="Movimiento"
          hint="El modo calma quita animaciones y efectos de movimiento."
          value={settings.calm ? "si" : "no"}
          options={[
            { value: "no", label: "Normal" },
            { value: "si", label: "Modo calma" },
          ]}
          onChange={(v) => update({ calm: v === "si" })}
        />
      </section>

      <section className="rounded-2xl bg-[var(--sage)] p-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
          Vista previa
        </p>
        <h2 className="mt-2 text-xl font-semibold">Así se verá el texto</h2>
        <p className="mt-2 text-[var(--muted)]">
          Darle tiempo para responder y anticipar lo que viene ayuda a participar con confianza.
        </p>
        <span className="mt-3 inline-block rounded-md bg-[var(--surface)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)]">
          Apoyo que funciona
        </span>
      </section>

      <div>
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
        >
          Restablecer ajustes
        </button>
      </div>
    </div>
  );
}