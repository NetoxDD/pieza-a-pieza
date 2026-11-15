import { localDate } from "@/lib/routines";
import { INTENSITY, PLACES } from "@/lib/episodes";

export const MIN_POINTS = 5;

export type EpRow = {
  occurred_at: string;
  place: string;
  intensity: number;
  duration_min: number | null;
  helped: string[] | null;
  voided_at: string | null;
};

export type Count = { label: string; long?: string; n: number };

export const SLOTS = [
  { key: "madrugada", short: "Madrugada", long: "Madrugada (0–6 h)", from: 0, to: 6 },
  { key: "manana", short: "Mañana", long: "Mañana (6–12 h)", from: 6, to: 12 },
  { key: "tarde", short: "Tarde", long: "Tarde (12–18 h)", from: 12, to: 18 },
  { key: "noche", short: "Noche", long: "Noche (18–24 h)", from: 18, to: 24 },
] as const;

export const slotOf = (d: Date) => SLOTS.find((s) => d.getHours() >= s.from && d.getHours() < s.to)!.key;

export const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export type EpisodeSummary = {
  total: number;
  days: number;
  avgDuration: number | null;
  withDuration: number;
  intensity: Count[];
  time: Count[];
  weekday: Count[];
  place: Count[];
  helped: Count[];
};

// Cuenta lo registrado (sin los episodios anulados). Nunca usa los textos libres.
export function summarizeEpisodes(all: EpRow[]): EpisodeSummary {
  const eps = all.filter((e) => !e.voided_at);
  const dates = eps.map((e) => new Date(e.occurred_at));
  const durs = eps.map((e) => e.duration_min).filter((x): x is number => x !== null);

  const helpedMap = new Map<string, { label: string; n: number }>();
  for (const e of eps) {
    for (const h of e.helped ?? []) {
      const k = h.trim().toLowerCase();
      if (!k) continue;
      const cur = helpedMap.get(k);
      if (cur) cur.n++;
      else helpedMap.set(k, { label: h.trim(), n: 1 });
    }
  }

  return {
    total: eps.length,
    days: new Set(dates.map((d) => localDate(d))).size,
    avgDuration: durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : null,
    withDuration: durs.length,
    intensity: INTENSITY.map((i) => ({ label: i.label, n: eps.filter((e) => e.intensity === i.key).length })),
    time: SLOTS.map((s) => ({ label: s.short, long: s.long, n: dates.filter((d) => slotOf(d) === s.key).length })),
    weekday: WEEKDAYS.map((w, i) => ({ label: w, n: dates.filter((d) => weekdayIndex(d) === i).length })),
    place: PLACES.map((p) => ({ label: p.label, n: eps.filter((e) => e.place === p.key).length })),
    helped: Array.from(helpedMap.values())
      .sort((a, b) => b.n - a.n)
      .slice(0, 5)
      .map((x) => ({ label: x.label, n: x.n })),
  };
}

export function median(nums: number[]) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const nextDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return localDate(new Date(y, m - 1, d + 1));
};

export type SleepVsEpisodes = {
  medianMin: number;
  shortN: number;
  longN: number;
  shortRate: number;
  longRate: number;
};

/**
 * Compara los episodios del día siguiente según si la noche fue más corta o más larga que la mediana del
 * propio niño. Devuelve null si no hay datos suficientes. Es una coincidencia en los registros, no una causa.
 */
export function sleepVsEpisodes(
  sleeps: { night_of: string; sleep_minutes: number }[],
  all: EpRow[]
): SleepVsEpisodes | null {
  const today = localDate(new Date());
  // Solo noches cuyo día siguiente ya terminó
  const rows = sleeps.filter((s) => nextDay(s.night_of) < today);
  if (rows.length < 10) return null;

  const med = median(rows.map((s) => s.sleep_minutes));
  const perDay: Record<string, number> = {};
  for (const e of all) {
    if (e.voided_at) continue;
    const k = localDate(new Date(e.occurred_at));
    perDay[k] = (perDay[k] ?? 0) + 1;
  }

  const short = rows.filter((s) => s.sleep_minutes < med);
  const long = rows.filter((s) => s.sleep_minutes >= med);
  if (short.length < MIN_POINTS || long.length < MIN_POINTS) return null;

  const rate = (g: typeof rows) => g.reduce((a, s) => a + (perDay[nextDay(s.night_of)] ?? 0), 0) / g.length;
  return { medianMin: med, shortN: short.length, longN: long.length, shortRate: rate(short), longRate: rate(long) };
}

const mondayOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const idx = (new Date(y, m - 1, d).getDay() + 6) % 7;
  return localDate(new Date(y, m - 1, d - idx));
};

// Horas promedio de sueño por semana
export function weeklySleep(sleeps: { night_of: string; sleep_minutes: number }[]): Count[] {
  const groups: Record<string, number[]> = {};
  for (const s of sleeps) (groups[mondayOf(s.night_of)] ??= []).push(s.sleep_minutes);
  return Object.keys(groups)
    .sort()
    .map((w) => ({
      label: `${w.slice(8)}/${w.slice(5, 7)}`,
      long: `Semana del ${w.slice(8)}/${w.slice(5, 7)} (${groups[w].length} noches)`,
      n: Math.round((groups[w].reduce((a, b) => a + b, 0) / groups[w].length / 60) * 10) / 10,
    }));
}

export function byMonth(dates: string[], months = 6): Count[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      label: d.toLocaleDateString("es-MX", { month: "short" }),
      long: d.toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
      n: dates.filter((x) => x.startsWith(key)).length,
    };
  });
}

export function topTags(rows: string[][], limit = 8): Count[] {
  const m = new Map<string, number>();
  for (const tags of rows) for (const t of tags) m.set(t, (m.get(t) ?? 0) + 1);
  return Array.from(m.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, n]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), n }));
}