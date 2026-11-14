export const MEALS = [
  { key: "desayuno", label: "Desayuno" },
  { key: "colacion", label: "Colación" },
  { key: "comida", label: "Comida" },
  { key: "cena", label: "Cena" },
] as const;

export const AMOUNTS = [
  { key: "nada", label: "Nada" },
  { key: "poco", label: "Poco" },
  { key: "normal", label: "Normal" },
  { key: "mucho", label: "Mucho" },
] as const;

export const QUALITY = [
  { key: "mala", label: "Mala" },
  { key: "regular", label: "Regular" },
  { key: "buena", label: "Buena" },
] as const;

export type Sleep = {
  id: string;
  author_id: string;
  night_of: string;
  sleep_minutes: number;
  wakeups: number;
  quality: string | null;
  note: string | null;
};

export type Meal = {
  id: string;
  author_id: string;
  day: string;
  meal: string;
  amount: string;
  note: string | null;
  updated_at: string;
};

export const SLEEP_COLS = "id,author_id,night_of,sleep_minutes,wakeups,quality,note";
export const MEAL_COLS = "id,author_id,day,meal,amount,note,updated_at";

export const amountLabel = (k: string) => AMOUNTS.find((a) => a.key === k)?.label ?? k;
export const mealLabel = (k: string) => MEALS.find((m) => m.key === k)?.label ?? k;

export function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ---------- Resumen para el informe ----------
export type WellbeingSummary = {
  nights: number;
  avgMinutes: number | null;
  avgWakeups: number | null;
  quality: { label: string; n: number }[];
  meals: { label: string; total: number; counts: { label: string; n: number }[] }[];
};

export function summarizeWellbeing(
  sleep: { sleep_minutes: number; wakeups: number; quality: string | null }[],
  meals: { meal: string; amount: string }[]
): WellbeingSummary {
  const nights = sleep.length;
  return {
    nights,
    avgMinutes: nights ? sleep.reduce((s, x) => s + x.sleep_minutes, 0) / nights : null,
    avgWakeups: nights ? sleep.reduce((s, x) => s + x.wakeups, 0) / nights : null,
    quality: QUALITY.map((q) => ({ label: q.label, n: sleep.filter((x) => x.quality === q.key).length })),
    meals: MEALS.map((m) => {
      const mine = meals.filter((x) => x.meal === m.key);
      return {
        label: m.label,
        total: mine.length,
        counts: AMOUNTS.map((a) => ({ label: a.label, n: mine.filter((x) => x.amount === a.key).length })),
      };
    }),
  };
}