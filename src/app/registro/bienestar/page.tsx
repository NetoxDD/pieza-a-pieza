"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import { localDate } from "@/lib/routines";
import {
  AMOUNTS,
  MEALS,
  MEAL_COLS,
  QUALITY,
  SLEEP_COLS,
  amountLabel,
  fmtDuration,
  type Meal,
  type Sleep,
} from "@/lib/wellbeing";

const daysAgo = (n: number) => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
};

const shortDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });

const KNOWN = ["Los registros", "Esa fecha", "Esos datos"];
function dbMessage(e: { message?: string; code?: string } | null) {
  if (!e) return "";
  if (e.code === "23505") return "Otra persona ya lo anotó. Recarga para verlo.";
  if (e.message && KNOWN.some((k) => e.message!.startsWith(k))) return e.message;
  return "No se pudo guardar. Revisa tus permisos e intenta de nuevo.";
}

const inputCls =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";

export default function Bienestar() {
  const { child, userId, role } = useChild();
  const { access } = useChildProfile();
  const { get } = useProfiles();
  const isFamily = role === "familia";
  const canWrite = role !== "pediatra";

  const [sleeps, setSleeps] = useState<Sleep[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Sueño
  const [night, setNight] = useState(daysAgo(1));
  const [hours, setHours] = useState(8);
  const [mins, setMins] = useState(0);
  const [wakeups, setWakeups] = useState(0);
  const [quality, setQuality] = useState("");
  const [note, setNote] = useState("");
  const [savedSleep, setSavedSleep] = useState(false);

  // Comidas
  const [mealDay, setMealDay] = useState(daysAgo(0));

  const minDate = daysAgo(isFamily ? 30 : 14);
  const nameOf = (id: string) => get(id)?.name ?? "Alguien del equipo";

  const load = useCallback(async () => {
    if (!access.wellbeing) {
      setLoading(false);
      return;
    }
    const since = daysAgo(30);
    const [s, m] = await Promise.all([
      supabase
        .from("sleep_logs")
        .select(SLEEP_COLS)
        .eq("child_id", child.id)
        .gte("night_of", since)
        .order("night_of", { ascending: false }),
      supabase
        .from("meal_logs")
        .select(MEAL_COLS)
        .eq("child_id", child.id)
        .gte("day", since)
        .order("day", { ascending: false }),
    ]);
    if (s.error || m.error) {
      setError("No se pudieron cargar los registros.");
    } else {
      setError("");
      setSleeps(s.data as Sleep[]);
      setMeals(m.data as Meal[]);
    }
    setLoading(false);
  }, [child.id, access.wellbeing]);

  useEffect(() => {
    load();
  }, [load]);

  const existingSleep = sleeps.find((x) => x.night_of === night);
  const canEditSleep = !existingSleep || existingSleep.author_id === userId || isFamily;

  // Al elegir una noche que ya tiene registro, se cargan sus datos
  useEffect(() => {
    const ex = sleeps.find((x) => x.night_of === night);
    if (ex) {
      setHours(Math.floor(ex.sleep_minutes / 60));
      setMins(ex.sleep_minutes % 60);
      setWakeups(ex.wakeups);
      setQuality(ex.quality ?? "");
      setNote(ex.note ?? "");
    } else {
      setHours(8);
      setMins(0);
      setWakeups(0);
      setQuality("");
      setNote("");
    }
  }, [night, sleeps]);

  const saveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      sleep_minutes: hours * 60 + mins,
      wakeups,
      quality: quality || null,
      note: note.trim() || null,
    };
    let err: { message?: string; code?: string } | null = null;
    if (existingSleep) {
      const { data, error } = await supabase
        .from("sleep_logs")
        .update(payload)
        .eq("id", existingSleep.id)
        .select("id");
      if (error) err = error;
      else if (!data?.length) err = { message: "" };
    } else {
      const { error } = await supabase.from("sleep_logs").insert({ child_id: child.id, night_of: night, ...payload });
      if (error) err = error;
    }
    setBusy(false);
    if (err) {
      setError(dbMessage(err));
      return;
    }
    setSavedSleep(true);
    setTimeout(() => setSavedSleep(false), 2500);
    load();
  };

  const removeSleep = async () => {
    if (!existingSleep || !window.confirm("¿Quitar el registro de esa noche?")) return;
    const { data, error } = await supabase.from("sleep_logs").delete().eq("id", existingSleep.id).select("id");
    if (error || !data?.length) setError("No se pudo quitar el registro.");
    else load();
  };

  const mealOf = (day: string, key: string) => meals.find((x) => x.day === day && x.meal === key);

  const setMeal = async (key: string, amount: string) => {
    setError("");
    const ex = mealOf(mealDay, key);
    if (ex) {
      if (ex.amount === amount) return;
      const { data, error } = await supabase.from("meal_logs").update({ amount }).eq("id", ex.id).select("id");
      if (error || !data?.length) {
        setError(error ? dbMessage(error) : "Solo quien lo anotó o la familia puede cambiarlo.");
        return;
      }
    } else {
      const { error } = await supabase.from("meal_logs").insert({ child_id: child.id, day: mealDay, meal: key, amount });
      if (error) {
        setError(dbMessage(error));
        load();
        return;
      }
    }
    load();
  };

  const removeMeal = async (id: string) => {
    const { data, error } = await supabase.from("meal_logs").delete().eq("id", id).select("id");
    if (error || !data?.length) setError("No se pudo quitar el registro.");
    else load();
  };

  const chip = (active: boolean, disabled?: boolean) =>
    `flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      disabled ? "opacity-50" : ""
    } ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  // ---------- Historial ----------
  const nights14 = Array.from({ length: 14 }, (_, i) => daysAgo(14 - i));
  const chartData = nights14.map((d) => {
    const s = sleeps.find((x) => x.night_of === d);
    return {
      noche: `${d.slice(8)}/${d.slice(5, 7)}`,
      horas: s ? Math.round((s.sleep_minutes / 60) * 10) / 10 : null,
    };
  });
  const recorded = nights14.map((d) => sleeps.find((x) => x.night_of === d)).filter((x): x is Sleep => !!x);
  const avg = recorded.length ? recorded.reduce((a, x) => a + x.sleep_minutes, 0) / recorded.length : null;
  const days7 = Array.from({ length: 7 }, (_, i) => daysAgo(i));

  if (!access.wellbeing) {
    return (
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Sueño y comidas</h1>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          La familia no ha compartido esta sección con tu rol.
        </p>
      </div>
    );
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sueño y comidas</h1>
        <p className="mt-1 text-[var(--muted)]">
          Anota lo básico de cada día. Sirve para ver cómo viene {child.name}, no para juzgar.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {canWrite && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Sueño</h2>
          <form onSubmit={saveSleep} className="mt-4 grid gap-5">
            <div className="flex flex-wrap items-end gap-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Noche del
                <input
                  type="date"
                  value={night}
                  min={minDate}
                  max={daysAgo(0)}
                  onChange={(e) => e.target.value && setNight(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Horas
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={inputCls}>
                  {Array.from({ length: 15 }, (_, h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Minutos
                <select value={mins} onChange={(e) => setMins(Number(e.target.value))} className={inputCls}>
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-semibold">Despertares</legend>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3, 4].map((n) => (
                  <label key={n} className={chip(wakeups === n)}>
                    <input
                      type="radio"
                      name="wakeups"
                      checked={wakeups === n}
                      onChange={() => setWakeups(n)}
                      className="sr-only"
                    />
                    {n === 4 ? "4 o más" : n}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-semibold">Cómo fue la noche (opcional)</legend>
              <div className="flex flex-wrap gap-2">
                {QUALITY.map((q) => (
                  <label key={q.key} className={chip(quality === q.key)}>
                    <input
                      type="radio"
                      name="quality"
                      checked={quality === q.key}
                      onChange={() => setQuality(q.key)}
                      className="sr-only"
                    />
                    {q.label}
                  </label>
                ))}
                {quality && (
                  <button
                    type="button"
                    onClick={() => setQuality("")}
                    className="min-h-11 rounded-full px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </fieldset>

            <label className="grid gap-1.5 text-xs font-semibold">
              Nota (opcional)
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputCls} />
            </label>

            {existingSleep && (
              <p className="text-xs text-[var(--muted)]">
                Esa noche ya la anotó {nameOf(existingSleep.author_id)}.{" "}
                {canEditSleep ? "Si guardas, se actualiza." : "Solo ella o la familia pueden cambiarla."}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy || !canEditSleep} className={primary}>
                {busy ? "Guardando…" : existingSleep ? "Actualizar" : "Guardar"}
              </button>
              {existingSleep && canEditSleep && (
                <button
                  type="button"
                  onClick={removeSleep}
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                >
                  Quitar registro
                </button>
              )}
              {savedSleep && (
                <span role="status" className="text-sm font-medium text-[var(--primary)]">
                  ✓ Guardado
                </span>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Comidas</h2>
        {canWrite && (
          <label className="mt-3 grid max-w-48 gap-1.5 text-xs font-semibold">
            Día
            <input
              type="date"
              value={mealDay}
              min={minDate}
              max={daysAgo(0)}
              onChange={(e) => e.target.value && setMealDay(e.target.value)}
              className={inputCls}
            />
          </label>
        )}

        <ul className="mt-4 divide-y divide-[var(--border)]">
          {MEALS.map((m) => {
            const ex = mealOf(mealDay, m.key);
            const mine = !ex || ex.author_id === userId || isFamily;
            return (
              <li key={m.key} className="py-4">
                <fieldset className="grid gap-2" disabled={!canWrite || !mine}>
                  <legend className="text-sm font-semibold">{m.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {AMOUNTS.map((a) => (
                      <label key={a.key} className={chip(ex?.amount === a.key, !canWrite || !mine)}>
                        <input
                          type="radio"
                          name={`meal-${m.key}`}
                          checked={ex?.amount === a.key}
                          onChange={() => setMeal(m.key, a.key)}
                          className="sr-only"
                        />
                        {a.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {ex && (
                  <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                    Anotó {nameOf(ex.author_id)} ·{" "}
                    {new Date(ex.updated_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                    {canWrite && mine && (
                      <button
                        type="button"
                        onClick={() => removeMeal(ex.id)}
                        className="min-h-11 rounded-lg px-3 font-semibold hover:bg-[var(--sage)]"
                      >
                        Quitar
                      </button>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Últimas 14 noches</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {avg === null
            ? "Todavía no hay noches registradas en este periodo."
            : `${recorded.length} ${recorded.length === 1 ? "noche registrada" : "noches registradas"}. Promedio: ${fmtDuration(avg)}.`}
        </p>

        <div className="mt-4 h-56" aria-hidden>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="noche" tick={{ fontSize: 11 }} interval={1} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 12]} />
              <Tooltip formatter={(v) => [`${v} h`, "Sueño"]} />
              <Bar dataKey="horas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[var(--primary)]">
            Ver como lista
          </summary>
          <ul className="mt-2 divide-y divide-[var(--border)] text-sm">
            {nights14
              .slice()
              .reverse()
              .map((d) => {
                const s = sleeps.find((x) => x.night_of === d);
                return (
                  <li key={d} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>{shortDay(d)}</span>
                    <span className="text-[var(--muted)]">
                      {s
                        ? `${fmtDuration(s.sleep_minutes)} · ${s.wakeups} ${s.wakeups === 1 ? "despertar" : "despertares"}${
                            s.quality ? ` · ${s.quality}` : ""
                          }`
                        : "Sin registro"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </details>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Comidas de los últimos 7 días</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="py-2 text-left font-semibold">Día</th>
                {MEALS.map((m) => (
                  <th key={m.key} className="py-2 text-left font-semibold">
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days7.map((d) => (
                <tr key={d} className="border-t border-[var(--border)]">
                  <th scope="row" className="py-2 text-left font-normal">
                    {shortDay(d)}
                  </th>
                  {MEALS.map((m) => {
                    const x = mealOf(d, m.key);
                    return (
                      <td key={m.key} className="py-2 text-[var(--muted)]">
                        {x ? amountLabel(x.amount) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">
          «—» significa que nadie lo anotó: no quiere decir que no haya comido.
        </p>
      </section>
    </div>
  );
}