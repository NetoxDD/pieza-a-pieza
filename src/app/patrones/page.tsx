"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import BarCard from "@/components/patterns/BarCard";
import { localDate } from "@/lib/routines";
import { AREAS } from "@/lib/wins";
import { fmtDuration } from "@/lib/wellbeing";
import {
  MIN_POINTS,
  byMonth,
  sleepVsEpisodes,
  summarizeEpisodes,
  topTags,
  weeklySleep,
  type EpRow,
} from "@/lib/patterns";

const PERIODS = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 180, label: "180 días" },
];

const MOODS = ["Contento", "Tranquilo", "Neutro", "Incómodo", "Triste", "Frustrado"];
const LIMIT = 1000;

const daysAgoIso = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysAgoDate = (n: number) => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
};

export default function Patrones() {
  const { child, role } = useChild();
  const { access } = useChildProfile();

  const [days, setDays] = useState(90);
  const [eps, setEps] = useState<EpRow[]>([]);
  const [sleeps, setSleeps] = useState<{ night_of: string; sleep_minutes: number }[]>([]);
  const [moods, setMoods] = useState<{ mood: string }[]>([]);
  const [wins, setWins] = useState<{ achieved_on: string; area: string }[]>([]);
  const [tags, setTags] = useState<string[][]>([]);
  const [obsTotal, setObsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = daysAgoIso(days);
      const sinceDate = daysAgoDate(days);
      const winsSince = daysAgoDate(185);

      const [e, s, m, w, o] = await Promise.all([
        supabase
          .from("episodes")
          .select("occurred_at,place,intensity,duration_min,helped,voided_at")
          .eq("child_id", child.id)
          .gte("occurred_at", since)
          .limit(LIMIT),
        access.wellbeing
          ? supabase
              .from("sleep_logs")
              .select("night_of,sleep_minutes")
              .eq("child_id", child.id)
              .gte("night_of", sinceDate)
              .limit(LIMIT)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("mood_logs").select("mood").eq("child_id", child.id).gte("created_at", since).limit(LIMIT),
        supabase.from("achievements").select("achieved_on,area").eq("child_id", child.id).gte("achieved_on", winsSince).limit(LIMIT),
        supabase.from("observations").select("tags").eq("child_id", child.id).gte("created_at", since).limit(LIMIT),
      ]);
      if (cancelled) return;
      if (e.error || s.error || m.error || w.error || o.error) {
        setError("No se pudieron cargar los datos.");
        setLoading(false);
        return;
      }
      setError("");
      setEps(e.data as EpRow[]);
      setSleeps(s.data as { night_of: string; sleep_minutes: number }[]);
      setMoods(m.data as { mood: string }[]);
      setWins(w.data as { achieved_on: string; area: string }[]);
      const obs = o.data as { tags: string[] | null }[];
      setTags(obs.map((x) => x.tags ?? []));
      setObsTotal(obs.length);
      setCapped([e.data, m.data, w.data, o.data].some((x) => (x?.length ?? 0) >= LIMIT));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id, days, access.wellbeing]);

  const ep = useMemo(() => summarizeEpisodes(eps), [eps]);
  const weekly = useMemo(() => weeklySleep(sleeps), [sleeps]);
  const compare = useMemo(() => sleepVsEpisodes(sleeps, eps), [sleeps, eps]);
  const winMonths = useMemo(() => byMonth(wins.map((x) => x.achieved_on), 6), [wins]);
  const winAreas = useMemo(
    () =>
      AREAS.map((a) => ({ label: a.label, n: wins.filter((x) => x.area === a.key && x.achieved_on >= daysAgoDate(days)).length })).filter(
        (x) => x.n > 0
      ),
    [wins, days]
  );
  const moodCounts = useMemo(
    () => MOODS.map((k) => ({ label: k, n: moods.filter((x) => x.mood === k).length })),
    [moods]
  );
  const tagList = useMemo(() => topTags(tags), [tags]);
  const winsInPeriod = wins.filter((x) => x.achieved_on >= daysAgoDate(days)).length;

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  const card = "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6";
  const seesAllEpisodes = role === "familia" || ["pediatra", "terapeuta", "logopeda"].includes(role);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patrones</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lo que se repite en los registros de {child.name}. Sirve para hacer mejores preguntas, no para sacar
          conclusiones.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
        {PERIODS.map((p) => (
          <button key={p.days} type="button" onClick={() => setDays(p.days)} aria-pressed={days === p.days} className={chip(days === p.days)}>
            Últimos {p.label}
          </button>
        ))}
      </div>

      <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Estos patrones se calculan <strong>solo con los registros que tu rol puede ver</strong>
        {!seesAllEpisodes && " (en los episodios, solo los que tú registraste, salvo que la familia haya abierto esa sección)"}.
        Un patrón muestra una <strong>coincidencia</strong> en lo anotado: no dice que una cosa cause la otra.
        Ninguno se muestra con menos de {MIN_POINTS} registros.
      </p>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Calculando…</p>}
      {capped && (
        <p className="text-xs text-[var(--muted)]">
          Hay más de {LIMIT} registros en algún apartado: se usaron los más recientes.
        </p>
      )}

      {!loading && !error && (
        <>
          <section className={card} aria-label="Resumen">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["Episodios", ep.total],
                ["Noches con sueño anotado", access.wellbeing ? sleeps.length : "—"],
                ["Logros", winsInPeriod],
                ["Observaciones", obsTotal],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dd className="text-3xl font-bold">{value}</dd>
                  <dt className="text-xs text-[var(--muted)]">{label}</dt>
                </div>
              ))}
            </dl>
          </section>

          <h2 className="mt-2 text-xl font-bold">Episodios</h2>
          <BarCard title="¿En qué momento del día?" data={ep.time} hint="Según la hora en que se anotó que ocurrió." />
          <BarCard title="¿Qué días de la semana?" data={ep.weekday} />
          <BarCard title="¿Dónde?" data={ep.place} />

          {ep.total >= MIN_POINTS && (
            <section className={card}>
              <h2 className="text-lg font-semibold">Intensidad, duración y lo que ayudó</h2>
              <ul className="mt-3 grid gap-1 text-sm">
                <li>
                  <strong>Intensidad:</strong> {ep.intensity.map((i) => `${i.label}: ${i.n}`).join(" · ")}
                </li>
                <li>
                  <strong>Duración:</strong>{" "}
                  {ep.avgDuration !== null && ep.withDuration >= MIN_POINTS
                    ? `en promedio ${fmtDuration(ep.avgDuration)} (en ${ep.withDuration} episodios con duración anotada)`
                    : "pocos episodios con la duración anotada para calcular un promedio"}
                </li>
              </ul>
              <h3 className="mt-4 text-sm font-semibold">Lo que más se anotó como ayuda</h3>
              {ep.helped.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">Todavía no se anotó qué ayudó en los episodios.</p>
              ) : (
                <ol className="mt-1 grid list-decimal gap-1 pl-6 text-sm">
                  {ep.helped.map((h) => (
                    <li key={h.label} className="[overflow-wrap:anywhere]">
                      {h.label} <span className="text-[var(--muted)]">({h.n} {h.n === 1 ? "vez" : "veces"})</span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mt-3 text-xs text-[var(--muted)]">
                Es lo que se anotó, no una medida de qué funciona mejor: lo comentan quienes estuvieron presentes.
              </p>
            </section>
          )}

          {access.wellbeing && (
            <>
              <h2 className="mt-2 text-xl font-bold">Sueño</h2>
              <BarCard
                title="Horas de sueño por semana"
                hint="Promedio de las noches anotadas en cada semana."
                data={weekly}
                unit=" h"
              />
              <section className={card}>
                <h2 className="text-lg font-semibold">Sueño y episodios</h2>
                {compare ? (
                  <>
                    <p className="mt-2 text-sm">
                      Después de las noches <strong>más cortas</strong> que su mediana ({fmtDuration(compare.medianMin)}), se
                      anotaron <strong>{compare.shortRate.toFixed(1)}</strong> episodios por día ({compare.shortN} noches). Después
                      de las noches <strong>más largas</strong>, <strong>{compare.longRate.toFixed(1)}</strong> ({compare.longN} noches).
                    </p>
                    <p className="mt-3 text-xs text-[var(--muted)]">
                      Esto muestra una coincidencia en lo anotado, no una causa. Los días sin episodios cuentan como
                      cero aunque nadie los haya registrado, y otras cosas influyen en cada día.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                    Para comparar hacen falta al menos 10 noches anotadas, 5 en cada grupo, y poder ver los episodios.
                  </p>
                )}
              </section>
            </>
          )}

          <h2 className="mt-2 text-xl font-bold">Ánimo, logros y observaciones</h2>
          <BarCard title="Estados de ánimo registrados" data={moodCounts} />
          <BarCard title="Logros por mes" hint="Los últimos 6 meses." data={winMonths} min={1} />
          {winAreas.length > 0 && (
            <section className={card}>
              <h2 className="text-lg font-semibold">Logros por área (en este periodo)</h2>
              <ul className="mt-2 grid gap-1 text-sm">
                {winAreas.map((a) => (
                  <li key={a.label}>
                    {a.label}: <strong>{a.n}</strong>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={card}>
            <h2 className="text-lg font-semibold">Etiquetas más usadas en las observaciones</h2>
            {tagList.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Todavía no hay observaciones con etiquetas en este periodo.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {tagList.map((t) => (
                  <li key={t.label} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-sm">
                    {t.label} <span className="text-[var(--muted)]">· {t.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Esta pantalla describe lo que se anotó. No diagnostica ni sugiere tratamientos: para eso, habla con un
        profesional de la salud.
      </div>
    </div>
  );
}