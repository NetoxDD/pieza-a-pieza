"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useSettings } from "@/components/SettingsProvider";
import Choice from "@/components/Choice";
import PalettePicker from "@/components/PalettePicker";
import { ACCENTS, childColor } from "@/lib/childColor";
import type { Settings } from "@/lib/settings";

export default function Ajustes() {
  const { settings, update, reset, restartOnboarding } = useSettings();
  const { child, role, reloadKids } = useChild();
  const [msg, setMsg] = useState("");

  const color = childColor(child.id, child.accent);

  const setAccent = async (accent: string | null) => {
    setMsg("");
    const { error } = await supabase.from("children").update({ accent }).eq("id", child.id);
    if (error) setMsg("No se pudo cambiar el color del espacio.");
    else reloadKids();
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ajustes</h1>
        <p className="mt-1 text-[var(--muted)]">
          Haz la app cómoda para ti. Los cambios se guardan solos y te siguen a otros dispositivos.
        </p>
      </div>

      <section className="grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Apariencia</h2>

        <PalettePicker value={settings.palette} onChange={(p) => update({ palette: p })} />

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

      {role === "familia" && (
        <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Color del espacio de {child.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            Lo ve todo el equipo en el encabezado y en el selector de niños. Ayuda a no confundir un
            niño con otro.
          </p>
          <fieldset>
            <legend className="sr-only">Color del espacio</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAccent(null)}
                aria-pressed={!child.accent}
                className={`min-h-11 rounded-full border px-4 text-sm transition ${
                  !child.accent
                    ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                    : "border-[var(--border)] hover:bg-[var(--sage)]"
                }`}
              >
                Automático
              </button>
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAccent(a.id)}
                  aria-pressed={child.accent === a.id}
                  className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm transition ${
                    child.accent === a.id
                      ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                      : "border-[var(--border)] hover:bg-[var(--sage)]"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-5 w-5 rounded-full border border-[var(--border)]"
                    style={{ background: a.bar }}
                  />
                  {a.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
            <span
              aria-hidden
              className="h-3 w-16 rounded-full"
              style={{ background: color.bar }}
            />
            Así se ve el borde del encabezado.
          </div>
          {msg && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {msg}
            </p>
          )}
        </section>
      )}

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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
        >
          Restablecer ajustes
        </button>
        <button
          type="button"
          onClick={restartOnboarding}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
        >
          Ver la guía de bienvenida
        </button>
      </div>
    </div>
  );
}