"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { INTENSITY, PLACES, epError, toLocalInput, type Episode } from "@/lib/episodes";

const inputCls =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const areaCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";

export default function EpisodeForm({
  initial,
  detonantes,
  ayudas,
  onDone,
  onCancel,
}: {
  initial?: Episode;
  detonantes: string[];
  ayudas: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { child } = useChild();
  const [when, setWhen] = useState(toLocalInput(initial ? new Date(initial.occurred_at) : new Date()));
  const [place, setPlace] = useState(initial?.place ?? "casa");
  const [before, setBefore] = useState(initial?.antecedent ?? "");
  const [what, setWhat] = useState(initial?.behavior ?? "");
  const [after, setAfter] = useState(initial?.consequence ?? "");
  const [intensity, setIntensity] = useState<number>(initial?.intensity ?? 2);
  const [duration, setDuration] = useState(initial?.duration_minn != null ? String(initial.duration_minn) : "");
  const [helped, setHelped] = useState<string[]>(initial?.helped ?? []);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggleHelp = (t: string) =>
    setHelped((h) => (h.includes(t) ? h.filter((x) => x !== t) : h.length >= 5 ? h : [...h, t]));

  const addOther = () => {
    const t = other.trim().slice(0, 200);
    if (!t || helped.includes(t) || helped.length >= 5) return;
    setHelped([...helped, t]);
    setOther("");
  };

  const addBefore = (t: string) => setBefore((b) => (b ? `${b}; ${t}` : t).slice(0, 300));

  const customs = helped.filter((h) => !ayudas.includes(h));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!what.trim()) return;
    setBusy(true);
    setError("");
    const payload = {
      occurred_at: new Date(when).toISOString(),
      place,
      antecedent: before.trim() || null,
      behavior: what.trim(),
      consequence: after.trim() || null,
      intensity,
      duration_minn: duration === "" ? null : Math.max(0, Math.min(600, Number(duration))),
      helped,
    };
    let err: { message?: string } | null = null;
    if (initial) {
      const { data, error } = await supabase.from("episodes").update(payload).eq("id", initial.id).select("id");
      if (error) err = error;
      else if (!data?.length) err = { message: "" };
    } else {
      const { error } = await supabase.from("episodes").insert({ child_id: child.id, ...payload });
      if (error) err = error;
    }
    setBusy(false);
    if (err) {
      setError(epError(err));
      return;
    }
    onDone();
  };

  const chip = (active: boolean) =>
    `flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  const btnChip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <form onSubmit={submit} className="grid gap-5">
      <p className="text-sm text-[var(--muted)]">
        Describe lo que se observó, sin juicios. Solo «Qué pasó» es obligatorio: puedes completar el resto después
        (tienes 24 horas para editarlo).
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1.5 text-xs font-semibold">
          Cuándo
          <input
            type="datetime-local"
            value={when}
            max={toLocalInput(new Date())}
            onChange={(e) => e.target.value && setWhen(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-semibold">
          Duración aproximada (min, opcional)
          <input
            type="number"
            min={0}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`${inputCls} max-w-40`}
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold">Dónde</legend>
        <div className="flex flex-wrap gap-2">
          {PLACES.map((p) => (
            <label key={p.key} className={chip(place === p.key)}>
              <input
                type="radio"
                name="place"
                checked={place === p.key}
                onChange={() => setPlace(p.key)}
                className="sr-only"
              />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold">Intensidad</legend>
        <div className="flex flex-wrap gap-2">
          {INTENSITY.map((i) => (
            <label key={i.key} className={chip(intensity === i.key)}>
              <input
                type="radio"
                name="intensity"
                checked={intensity === i.key}
                onChange={() => setIntensity(i.key)}
                className="sr-only"
              />
              {i.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <label className="grid gap-1.5 text-xs font-semibold">
          Antes: ¿qué estaba pasando? (opcional)
          <textarea value={before} onChange={(e) => setBefore(e.target.value)} maxLength={300} rows={2} className={areaCls} />
        </label>
        {detonantes.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Detonantes del plan de calma">
            {detonantes.map((d) => (
              <button key={d} type="button" onClick={() => addBefore(d)} className={btnChip(false)}>
                + {d}
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="grid gap-1.5 text-xs font-semibold">
        Qué pasó
        <textarea
          value={what}
          onChange={(e) => setWhat(e.target.value)}
          maxLength={300}
          rows={3}
          required
          className={areaCls}
        />
      </label>

      <label className="grid gap-1.5 text-xs font-semibold">
        Después: ¿qué siguió? (opcional)
        <textarea value={after} onChange={(e) => setAfter(e.target.value)} maxLength={300} rows={2} className={areaCls} />
      </label>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold">Qué ayudó (opcional, hasta 5)</legend>
        {ayudas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ayudas.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={helped.includes(a)}
                onClick={() => toggleHelp(a)}
                className={btnChip(helped.includes(a))}
              >
                {a}
              </button>
            ))}
          </div>
        )}
        {customs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {customs.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleHelp(c)}
                aria-label={`Quitar: ${c}`}
                className={btnChip(true)}
              >
                {c} ×
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold">
            Otra cosa que ayudó
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addOther();
                }
              }}
              className={inputCls}
            />
          </label>
          <button
            type="button"
            onClick={addOther}
            disabled={!other.trim() || helped.length >= 5}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-50"
          >
            Añadir
          </button>
        </div>
        {ayudas.length === 0 && (
          <p className="text-xs text-[var(--muted)]">
            Si la familia completa «Qué ayuda» en el Plan de calma, aparecerá aquí para elegirlo con un toque.
          </p>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !what.trim()}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Guardando…" : initial ? "Guardar cambios" : "Guardar episodio"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}