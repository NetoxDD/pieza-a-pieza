"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DAY_LABELS, hhmm, localDate } from "@/lib/routines";
import { fmtQty, type Med } from "@/lib/meds";

type Mode = "times" | "hours" | "days" | "weeks" | "monthly" | "cycle" | "prn";
type Row = { t: string; u: string };
type Form = {
  mode: Mode;
  rows: Row[];
  perUnits: boolean;
  days: number[];
  everyHours: number;
  anchorTime: string;
  everyN: string;
  weeksN: string;
  weekday: number;
  anchorDate: string;
  monthDay: string;
  cycleOn: string;
  cycleOff: string;
  endsOn: string;
  grace: string;
  minInterval: string;
};
type Payload = {
  as_needed: boolean;
  times: string[];
  days: number[];
  schedule_kind: "weekly" | "every_n_days" | "monthly" | "cycle";
  every_hours: number | null;
  every_n_days: number | null;
  month_day: number | null;
  cycle_on_days: number | null;
  cycle_off_days: number | null;
  anchor_date: string | null;
  time_units: number[] | null;
};
type Built = { ok: true; v: Payload } | { ok: false; error: string };

const ALL = [1, 2, 3, 4, 5, 6, 7];
const HOURS = [1, 2, 3, 4, 6, 8, 12];
const WEEKDAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "times", label: "Horas fijas", hint: "Las mismas horas en los días que elijas (por ejemplo, solo los jueves)." },
  { key: "hours", label: "Cada X horas", hint: "Por ejemplo, cada 8 horas todos los días." },
  { key: "days", label: "Cada N días", hint: "Por ejemplo, un día sí y otro no." },
  { key: "weeks", label: "Cada N semanas", hint: "Por ejemplo, cada 2 semanas, los miércoles." },
  { key: "monthly", label: "Mensual", hint: "Un día fijo de cada mes." },
  { key: "cycle", label: "Ciclo", hint: "Días con medicina y días de descanso." },
  { key: "prn", label: "Solo si es necesario", hint: "Sin horario: se anota cuando se da." },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const hoursTimes = (anchor: string, every: number) => {
  const base = toMin(anchor || "08:00");
  return Array.from({ length: 24 / every }, (_, k) => fromMin((base + k * every * 60) % 1440)).sort();
};
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parse(s);
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};
const isoDow = (s: string) => ((parse(s).getDay() + 6) % 7) + 1;
const firstWeekday = (from: string, wd: number) => addDays(from, (wd - isoDow(from) + 7) % 7);

function initial(med: Med): Form {
  const today = localDate();
  const n = med.every_n_days ?? 0;
  const mode: Mode = med.as_needed
    ? "prn"
    : med.schedule_kind === "monthly"
    ? "monthly"
    : med.schedule_kind === "cycle"
    ? "cycle"
    : med.schedule_kind === "every_n_days"
    ? n % 7 === 0
      ? "weeks"
      : "days"
    : med.every_hours
    ? "hours"
    : "times";
  const rows: Row[] = med.times.length
    ? med.times.map((t, i) => ({ t: hhmm(t), u: med.time_units?.[i] != null ? String(med.time_units[i]) : "" }))
    : [{ t: "08:00", u: "" }];
  return {
    mode,
    rows,
    perUnits: !!med.time_units && med.time_units.length === med.times.length,
    days: med.days.length ? med.days : ALL,
    everyHours: med.every_hours ?? 8,
    anchorTime: med.times.length ? hhmm(med.times[0]) : "08:00",
    everyN: String(mode === "days" && n ? n : 2),
    weeksN: String(mode === "weeks" && n ? n / 7 : 2),
    weekday: med.anchor_date ? isoDow(med.anchor_date) : 1,
    anchorDate: med.anchor_date ?? today,
    monthDay: String(med.month_day ?? Number(today.slice(8))),
    cycleOn: String(med.cycle_on_days ?? 21),
    cycleOff: String(med.cycle_off_days ?? 7),
    endsOn: med.ends_on ?? "",
    grace: String(med.grace_min),
    minInterval: med.min_interval_hours != null ? String(med.min_interval_hours) : "",
  };
}

const err = (error: string): Built => ({ ok: false, error });
const isInt = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

function build(f: Form): Built {
  const none = {
    every_hours: null,
    every_n_days: null,
    month_day: null,
    cycle_on_days: null,
    cycle_off_days: null,
    anchor_date: null,
    time_units: null,
  };
  if (f.mode === "prn") {
    return { ok: true, v: { as_needed: true, times: [], days: ALL, schedule_kind: "weekly", ...none } };
  }

  const rows: Row[] =
    f.mode === "hours"
      ? hoursTimes(f.anchorTime, f.everyHours).map((t) => ({ t, u: "" }))
      : f.rows.filter((r) => r.t);
  if (rows.length === 0) return err("Añade al menos una hora.");
  if (new Set(rows.map((r) => r.t)).size !== rows.length) return err("Hay horas repetidas.");
  const sorted = [...rows].sort((a, b) => a.t.localeCompare(b.t));

  let units: number[] | null = null;
  if (f.perUnits && f.mode !== "hours") {
    units = sorted.map((r) => Number(r.u));
    if (units.some((u) => !(u > 0 && u <= 100))) return err("Escribe la cantidad de cada toma (mayor que 0).");
  }

  const base: Payload = {
    as_needed: false,
    times: sorted.map((r) => r.t),
    days: ALL,
    schedule_kind: "weekly",
    ...none,
    time_units: units,
  };

  switch (f.mode) {
    case "times":
      if (f.days.length === 0) return err("Elige al menos un día.");
      return { ok: true, v: { ...base, days: [...f.days].sort() } };
    case "hours":
      return { ok: true, v: { ...base, every_hours: f.everyHours } };
    case "days": {
      const n = Number(f.everyN);
      if (!isInt(n, 2, 60)) return err("Elige entre 2 y 60 días.");
      return { ok: true, v: { ...base, schedule_kind: "every_n_days", every_n_days: n, anchor_date: f.anchorDate } };
    }
    case "weeks": {
      const w = Number(f.weeksN);
      if (!isInt(w, 1, 8)) return err("Elige entre 1 y 8 semanas.");
      if (w === 1) return { ok: true, v: { ...base, days: [f.weekday] } };
      return {
        ok: true,
        v: {
          ...base,
          schedule_kind: "every_n_days",
          every_n_days: w * 7,
          anchor_date: firstWeekday(f.anchorDate, f.weekday),
        },
      };
    }
    case "monthly": {
      const d = Number(f.monthDay);
      if (!isInt(d, 1, 31)) return err("Elige un día del mes entre 1 y 31.");
      return { ok: true, v: { ...base, schedule_kind: "monthly", month_day: d } };
    }
    case "cycle": {
      const on = Number(f.cycleOn);
      const off = Number(f.cycleOff);
      if (!isInt(on, 1, 365) || !isInt(off, 1, 365)) return err("Los días del ciclo deben estar entre 1 y 365.");
      if (f.days.length === 0) return err("Elige al menos un día de la semana.");
      return {
        ok: true,
        v: {
          ...base,
          days: [...f.days].sort(),
          schedule_kind: "cycle",
          cycle_on_days: on,
          cycle_off_days: off,
          anchor_date: f.anchorDate,
        },
      };
    }
    default:
      return err("Elige una frecuencia.");
  }
}

const KNOWN = ["Las horas", "Cada hora", "La cantidad"];
function dbMsg(e: { message?: string } | null) {
  if (!e) return "Solo la familia puede editar el horario.";
  if (e.message && KNOWN.some((k) => e.message!.startsWith(k))) return e.message;
  return "No se pudo guardar. Revisa los datos e intenta de nuevo.";
}

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function ScheduleEditor({
  med,
  onSaved,
  onCancel,
}: {
  med: Med;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<Form>(() => initial(med));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [preview, setPreview] = useState<{ d: string; t: string; u: number }[] | null>(null);
  const built = useMemo(() => build(f), [f]);
  const set = (patch: Partial<Form>) => setF((x) => ({ ...x, ...patch }));

  const key = built.ok ? JSON.stringify([built.v, f.endsOn]) : "";

  // Vista previa: la misma regla de la base de datos, aplicada a lo que estás escribiendo
  useEffect(() => {
    if (!built.ok || built.v.as_needed) {
      setPreview(null);
      return;
    }
    const v = built.v;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const from = localDate();
      const { data, error } = await supabase.rpc("med_preview", {
        p_kind: v.schedule_kind,
        p_days: v.days,
        p_every_n: v.every_n_days,
        p_month_day: v.month_day,
        p_cyc_on: v.cycle_on_days,
        p_cyc_off: v.cycle_off_days,
        p_anchor: v.anchor_date,
        p_times: v.times,
        p_units: v.time_units ?? v.times.map(() => Number(med.units_per_dose)),
        p_start: med.started_on,
        p_end: f.endsOn || null,
        d_from: from,
        d_to: addDays(from, 60),
      });
      if (cancelled) return;
      if (error) {
        setPreview(null);
        return;
      }
      setPreview(
        (data as { slot_date: string; slot_time: string; units: number | string }[]).map((r) => ({
          d: r.slot_date,
          t: hhmm(r.slot_time),
          u: Number(r.units),
        }))
      );
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!built.ok) {
      setMsg(built.error);
      return;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase
      .from("child_medications")
      .update({
        ...built.v,
        ends_on: f.endsOn || null,
        grace_min: Math.max(0, Math.min(720, Number(f.grace) || 0)),
        min_interval_hours: built.v.as_needed && f.minInterval ? Number(f.minInterval) : null,
        schedule_effective_on: localDate(),
      })
      .eq("id", med.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMsg(dbMsg(error));
      return;
    }
    onSaved();
  };

  const chip = (active: boolean) =>
    `flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  const dayChips = (
    <fieldset>
      <legend className="text-xs font-semibold">Días de la semana</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {DAY_LABELS.map((label, i) => {
          const d = i + 1;
          const on = f.days.includes(d);
          return (
            <label
              key={d}
              className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border px-3 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                on
                  ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => set({ days: on ? f.days.filter((x) => x !== d) : [...f.days, d] })}
                className="sr-only"
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  const sinceField = (label: string) => (
    <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
      {label}
      <input type="date" value={f.anchorDate} onChange={(e) => e.target.value && set({ anchorDate: e.target.value })} className={input} />
    </label>
  );

  const timeRows = (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-semibold">Horas de cada toma</legend>
      <div className="grid gap-2">
        {f.rows.map((r, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <input
              type="time"
              value={r.t}
              aria-label={`Hora ${i + 1}`}
              onChange={(e) => set({ rows: f.rows.map((x, k) => (k === i ? { ...x, t: e.target.value } : x)) })}
              className={input}
            />
            {f.perUnits && (
              <label className="flex items-center gap-1 text-xs">
                <span className="sr-only">Unidades de la toma {i + 1}</span>
                <input
                  type="number"
                  min={0.25}
                  max={100}
                  step={0.25}
                  value={r.u}
                  placeholder="1"
                  onChange={(e) => set({ rows: f.rows.map((x, k) => (k === i ? { ...x, u: e.target.value } : x)) })}
                  className={`${input} w-24`}
                />
                unidades
              </label>
            )}
            {f.rows.length > 1 && (
              <button
                type="button"
                onClick={() => set({ rows: f.rows.filter((_, k) => k !== i) })}
                aria-label={`Quitar la hora ${i + 1}`}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        {f.rows.length < 12 && (
          <div>
            <button
              type="button"
              onClick={() => set({ rows: [...f.rows, { t: "20:00", u: "" }] })}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
            >
              + Añadir hora
            </button>
          </div>
        )}
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={f.perUnits}
          onChange={(e) => set({ perUnits: e.target.checked })}
          className="h-4 w-4 shrink-0 accent-[var(--primary)]"
        />
        Dosis distinta según la hora
      </label>
    </fieldset>
  );

  const list = preview ?? [];
  const in30 = list.filter((x) => x.d <= addDays(localDate(), 30)).length;
  const showUnits = built.ok && !!built.v.time_units && new Set(built.v.time_units).size > 1;

  return (
    <form onSubmit={save} className="mt-4 grid gap-5 rounded-xl bg-[var(--background)] p-4">
      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold">Frecuencia</legend>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <label key={m.key} className={chip(f.mode === m.key)}>
              <input
                type="radio"
                name={`mode-${med.id}`}
                checked={f.mode === m.key}
                onChange={() => set({ mode: m.key })}
                className="sr-only"
              />
              {m.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">{MODES.find((m) => m.key === f.mode)?.hint}</p>
      </fieldset>

      {f.mode === "hours" && (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1.5 text-xs font-semibold">
              Cada
              <select value={f.everyHours} onChange={(e) => set({ everyHours: Number(e.target.value) })} className={input}>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h} {h === 1 ? "hora" : "horas"}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Desde las
              <input type="time" value={f.anchorTime} onChange={(e) => e.target.value && set({ anchorTime: e.target.value })} className={input} />
            </label>
          </div>
          <p className="text-sm">
            Tomas del día: <strong>{hoursTimes(f.anchorTime, f.everyHours).join(" · ")}</strong>
          </p>
          <p className="text-xs text-[var(--muted)]">
            Solo se ofrecen las frecuencias que reparten el día en partes iguales, para que las horas sean las mismas
            todos los días.
          </p>
        </div>
      )}

      {f.mode === "days" && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Cada cuántos días
            <input type="number" min={2} max={60} value={f.everyN} onChange={(e) => set({ everyN: e.target.value })} className={`${input} w-28`} />
          </label>
          {sinceField("Empezando el")}
        </div>
      )}

      {f.mode === "weeks" && (
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Cada cuántas semanas
            <input type="number" min={1} max={8} value={f.weeksN} onChange={(e) => set({ weeksN: e.target.value })} className={`${input} w-28`} />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            El día
            <select value={f.weekday} onChange={(e) => set({ weekday: Number(e.target.value) })} className={input}>
              {WEEKDAYS.map((w, i) => (
                <option key={w} value={i + 1}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          {sinceField("A partir del")}
        </div>
      )}

      {f.mode === "monthly" && (
        <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
          Día del mes
          <input type="number" min={1} max={31} value={f.monthDay} onChange={(e) => set({ monthDay: e.target.value })} className={input} />
          <small className="text-xs font-normal text-[var(--muted)]">Si el mes es más corto, se usa su último día.</small>
        </label>
      )}

      {f.mode === "cycle" && (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="grid gap-1.5 text-xs font-semibold">
              Días con medicina
              <input type="number" min={1} max={365} value={f.cycleOn} onChange={(e) => set({ cycleOn: e.target.value })} className={`${input} w-28`} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Días de descanso
              <input type="number" min={1} max={365} value={f.cycleOff} onChange={(e) => set({ cycleOff: e.target.value })} className={`${input} w-28`} />
            </label>
            {sinceField("El ciclo empieza el")}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Ciclos frecuentes">
            {[
              { l: "3 semanas sí, 1 no", on: 21, off: 7 },
              { l: "2 semanas sí, 1 no", on: 14, off: 7 },
              { l: "5 días sí, 2 no", on: 5, off: 2 },
            ].map((p) => (
              <button
                key={p.l}
                type="button"
                onClick={() => set({ cycleOn: String(p.on), cycleOff: String(p.off) })}
                className="min-h-11 rounded-full border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[var(--sage)]"
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>
      )}

      {f.mode !== "hours" && f.mode !== "prn" && timeRows}
      {(f.mode === "times" || f.mode === "cycle") && dayChips}

      {f.mode !== "prn" && (
        <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
          Margen de tolerancia (minutos)
          <input type="number" min={0} max={720} value={f.grace} onChange={(e) => set({ grace: e.target.value })} className={input} />
        </label>
      )}

      {f.mode === "prn" && (
        <label className="grid max-w-64 gap-1.5 text-xs font-semibold">
          Espera mínima entre dosis, en horas (opcional)
          <input
            type="number"
            min={0.5}
            max={48}
            step={0.5}
            value={f.minInterval}
            onChange={(e) => set({ minInterval: e.target.value })}
            placeholder="Según indique tu médico"
            className={input}
          />
          <small className="text-xs font-normal text-[var(--muted)]">
            La app solo compara horas y avisa, sin bloquear. No la propone ella.
          </small>
        </label>
      )}

      <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
        Termina el (opcional)
        <input type="date" value={f.endsOn} onChange={(e) => set({ endsOn: e.target.value })} className={input} />
      </label>

      {built.ok && !built.v.as_needed && (
        <section aria-label="Vista previa de las próximas tomas" className="rounded-xl border border-[var(--border)] p-4">
          <h3 className="text-sm font-semibold">Próximas tomas</h3>
          {preview === null ? (
            <p className="mt-1 text-xs text-[var(--muted)]">Calculando…</p>
          ) : list.length === 0 ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Con esta configuración no hay tomas en los próximos 60 días.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {in30} {in30 === 1 ? "toma" : "tomas"} en los próximos 30 días.
              </p>
              <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                {list.slice(0, 10).map((x, i) => (
                  <li key={i} className="rounded-md bg-[var(--sage)] px-2.5 py-1 font-semibold text-[var(--primary)]">
                    {new Date(`${x.d}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}{" "}
                    · {x.t}
                    {showUnits ? ` (${fmtQty(x.u)} u.)` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {!built.ok && (
        <p role="status" className="text-sm text-[var(--danger)]">
          {built.error}
        </p>
      )}
      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}

      <p className="text-xs text-[var(--muted)]">
        El cambio vale desde hoy. Las tomas de días anteriores no cambian.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !built.ok}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Guardar horario"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}