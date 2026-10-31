"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useSettings } from "@/components/SettingsProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import Avatar, { PRESETS, PresetArt } from "@/components/Avatar";
import PalettePicker from "@/components/PalettePicker";
import Choice from "@/components/Choice";
import { roleKeys, roleLabel } from "@/lib/roles";
import type { Settings } from "@/lib/settings";

const TOTAL = 5;
const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function Welcome() {
  const { child, role, userId, userName } = useChild();
  const { settings, update, onboardingDone, finishOnboarding } = useSettings();
  const { get, reload } = useProfiles();
  const me = get(userId);

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [inviteRole, setInviteRole] = useState("tutor");
  const [code, setCode] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Al cambiar de paso, el foco va al título para que se anuncie
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, onboardingDone]);

  if (onboardingDone !== false) return null;

  const name = me?.name || userName;
  const isFamily = role === "familia";
  const inviteRoles = roleKeys.filter((k) => k !== "familia");

  const choosePreset = async (id: string) => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_kind: "preset", avatar_preset: id, avatar_path: null })
      .eq("id", userId);
    setBusy(false);
    if (error) setMsg("No se pudo cambiar el avatar.");
    else reload();
  };

  const next = async () => {
    setMsg("");
    if (step === 1 && title.trim()) {
      setBusy(true);
      const { error } = await supabase
        .from("profiles")
        .update({ title: title.trim() })
        .eq("id", userId);
      setBusy(false);
      if (error) {
        setMsg("No se pudo guardar tu profesión.");
        return;
      }
      reload();
    }
    setStep((s) => Math.min(TOTAL - 1, s + 1));
  };

  const generate = async () => {
    setBusy(true);
    setMsg("");
    setCode("");
    const { data, error } = await supabase.rpc("create_invite", { cid: child.id, r: inviteRole });
    setBusy(false);
    if (error) setMsg(error.message);
    else setCode(data as string);
  };

  const primary =
    "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
  const ghost =
    "min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--background)] p-5"
    >
      <div className="mx-auto my-6 grid max-w-lg gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--muted)]">
            Paso {step + 1} de {TOTAL}
          </p>
          <button type="button" onClick={finishOnboarding} className="min-h-11 text-xs font-semibold text-[var(--muted)] hover:underline">
            Saltar guía
          </button>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--sage)]"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL}
          aria-label="Avance de la guía"
        >
          <div
            className="h-full rounded-full bg-[var(--primary)]"
            style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
          />
        </div>

        {step === 0 && (
          <>
            <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
              Te damos la bienvenida{name ? `, ${name}` : ""}
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Entras al espacio de <strong>{child.name}</strong> como{" "}
              <strong>{roleLabel[role] ?? role}</strong>.
            </p>
            <ul className="grid gap-3 text-sm">
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Un espacio compartido.</strong> La familia y el equipo ven lo mismo y se coordinan.
              </li>
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Sin presión.</strong> Seguimos el ritmo de cada niño, no una lista de exigencias.
              </li>
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Tú decides cómo se ve.</strong> Colores, tamaño de letra y más. Son pocos pasos y puedes saltarlos.
              </li>
            </ul>
          </>
        )}

        {step === 1 && (
          <>
            <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
              Tu perfil
            </h1>
            <div className="flex items-center gap-4">
              <Avatar profile={me} name={name || "?"} size={64} />
              <p className="text-sm text-[var(--muted)]">
                Así te verá el equipo. Puedes cambiarlo cuando quieras en Mi perfil.
              </p>
            </div>

            {me?.avatarKind === "photo" ? (
              <p className="text-sm text-[var(--muted)]">
                Ya elegiste una foto. Puedes cambiarla en Mi perfil.
              </p>
            ) : (
              <fieldset>
                <legend className="text-sm font-semibold">Elige un avatar</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESETS.map((p) => {
                    const selected = me?.avatarPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => choosePreset(p.id)}
                        disabled={busy}
                        aria-pressed={selected}
                        aria-label={p.label}
                        className={`rounded-full p-1 transition disabled:opacity-60 ${
                          selected ? "ring-4 ring-[var(--primary)]" : "ring-1 ring-[var(--border)] hover:ring-2"
                        }`}
                      >
                        <PresetArt preset={p} size={44} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <label className="grid gap-1.5 text-xs font-semibold">
              Profesión o título (opcional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                placeholder="Ej. Pediatra, Maestra de 3.º, Mamá"
                className={input}
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
              Cómo quieres verla
            </h1>
            <p className="text-sm text-[var(--muted)]">Los cambios se aplican al instante.</p>
            <PalettePicker value={settings.palette} onChange={(p) => update({ palette: p })} />
            <Choice<Settings["fontScale"]>
              legend="Tamaño de letra"
              value={settings.fontScale}
              options={[
                { value: "normal", label: "Normal" },
                { value: "grande", label: "Grande" },
                { value: "muy-grande", label: "Muy grande" },
              ]}
              onChange={(v) => update({ fontScale: v })}
            />
            <Choice<Settings["theme"]>
              legend="Tema"
              value={settings.theme}
              options={[
                { value: "claro", label: "Claro" },
                { value: "oscuro", label: "Oscuro" },
                { value: "auto", label: "Automático" },
              ]}
              onChange={(v) => update({ theme: v })}
            />
            <p className="text-xs text-[var(--muted)]">
              En Ajustes encontrarás también contraste alto, letra de alta legibilidad y modo calma.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
              Tu equipo
            </h1>
            {isFamily ? (
              <>
                <p className="text-sm text-[var(--muted)]">
                  Invita a quienes acompañan a {child.name}: maestros, terapeutas, pediatra u otros
                  cuidadores. Recibirán un código de un solo uso.
                </p>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Rol que tendrá
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className={input}>
                    {inviteRoles.map((k) => (
                      <option key={k} value={k}>
                        {roleLabel[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={generate} disabled={busy} className={primary}>
                  {busy ? "Generando…" : "Generar código"}
                </button>
                {code && (
                  <div className="rounded-xl bg-[var(--blue)] p-4" role="status">
                    <p className="text-xs text-[var(--blue-text)]">
                      Comparte este código. Sirve una sola vez y vence en 7 días.
                    </p>
                    <p className="mt-2 select-all text-xl font-bold tracking-widest">{code}</p>
                  </div>
                )}
                <p className="text-xs text-[var(--muted)]">
                  Puedes invitar a más personas después, en la sección Equipo.
                </p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Ya formas parte del equipo de {child.name}. Puedes ver quiénes acompañan en la
                sección Equipo.
              </p>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h1 id="welcome-title" ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none">
              Todo listo
            </h1>
            <ul className="grid gap-3 text-sm">
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Inicio:</strong> el registro rápido y el resumen de la semana.
              </li>
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Día a día y Mensajes:</strong> rutinas, observaciones y el chat del equipo.
              </li>
              <li className="rounded-xl bg-[var(--sage)] p-4">
                <strong>Más:</strong> documentos, equipo, tu perfil y los ajustes.
              </li>
            </ul>
            <p className="text-xs text-[var(--muted)]">
              Puedes repetir esta guía cuando quieras desde Ajustes.
            </p>
          </>
        )}

        {msg && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {msg}
          </p>
        )}

        <div className="flex flex-wrap justify-between gap-2">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className={ghost}>
              Atrás
            </button>
          ) : (
            <span />
          )}
          {step < TOTAL - 1 ? (
            <button type="button" onClick={next} disabled={busy} className={primary}>
              Siguiente
            </button>
          ) : (
            <button type="button" onClick={finishOnboarding} className={primary}>
              Empezar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}