import { supabase } from "@/lib/supabase";
import { localDate } from "@/lib/routines";

export type Side = "escuela" | "casa";

// Qué rol escribe de qué lado (la base de datos lo vuelve a decidir; el pediatra solo lee)
export const SIDE_OF: Record<string, Side | undefined> = {
  tutor: "escuela",
  terapeuta: "escuela",
  logopeda: "escuela",
  familia: "casa",
  cuidador: "casa",
};

export const sideLabel = (s: string) => (s === "escuela" ? "Escuela" : "Casa");
export const otherSide = (s: Side): Side => (s === "escuela" ? "casa" : "escuela");

export const DAY_MOODS = [
  { key: "muy_bien", label: "Muy bien", emoji: "😊" },
  { key: "bien", label: "Bien", emoji: "🙂" },
  { key: "regular", label: "Regular", emoji: "😐" },
  { key: "dificil", label: "Difícil", emoji: "😟" },
] as const;

export const APPETITE = [
  { key: "nada", label: "Nada" },
  { key: "poco", label: "Poco" },
  { key: "normal", label: "Normal" },
  { key: "mucho", label: "Mucho" },
] as const;

export const SLEEP = [
  { key: "mala", label: "Mal" },
  { key: "regular", label: "Regular" },
  { key: "buena", label: "Bien" },
] as const;

export type Entry = {
  id: string;
  day: string;
  side: Side;
  author_id: string;
  mood: string | null;
  appetite: string | null;
  sleep: string | null;
  highlights: string | null;
  heads_up: string | null;
  request: string | null;
  seen_by: string | null;
  seen_at: string | null;
  created_at: string;
};

export const NB_COLS =
  "id,day,side,author_id,mood,appetite,sleep,highlights,heads_up,request,seen_by,seen_at,created_at";

export const optLabel = (list: readonly { key: string; label: string }[], key: string | null) =>
  list.find((x) => x.key === key)?.label ?? "";

export const daysAgo = (n: number) => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
};

const MOOD_MAP: Record<string, string> = {
  Contento: "muy_bien",
  Tranquilo: "bien",
  Neutro: "regular",
  Incómodo: "dificil",
  Triste: "dificil",
  Frustrado: "dificil",
};

const AMOUNT_ORDER = ["nada", "poco", "normal", "mucho"];

export type Suggestion = { mood?: string; appetite?: string; sleep?: string; used: string[] };

/**
 * Sugiere respuestas a partir de lo ya registrado. Cada consulta pasa por las mismas reglas de acceso
 * que el resto de la app: si tu rol no ve esa sección, simplemente no devuelve nada.
 */
export async function suggestFromRecords(childId: string, day: string): Promise<Suggestion> {
  const [y, m, d] = day.split("-").map(Number);
  const start = new Date(y, m - 1, d).toISOString();
  const end = new Date(y, m - 1, d + 1).toISOString();
  const prevNight = localDate(new Date(y, m - 1, d - 1));
  const used: string[] = [];
  const out: Suggestion = { used };

  const [mood, meals, sleep] = await Promise.all([
    supabase.from("mood_logs").select("mood").eq("child_id", childId).gte("created_at", start).lt("created_at", end),
    supabase.from("meal_logs").select("amount").eq("child_id", childId).eq("day", day),
    supabase.from("sleep_logs").select("quality").eq("child_id", childId).eq("night_of", prevNight).maybeSingle(),
  ]);

  if (!mood.error && mood.data?.length) {
    const counts: Record<string, number> = {};
    for (const r of mood.data as { mood: string }[]) {
      const k = MOOD_MAP[r.mood];
      if (k) counts[k] = (counts[k] ?? 0) + 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (best) {
      out.mood = best[0];
      used.push("los estados de ánimo del día");
    }
  }

  if (!meals.error && meals.data?.length) {
    const scores = (meals.data as { amount: string }[]).map((r) => AMOUNT_ORDER.indexOf(r.amount)).filter((n) => n >= 0);
    if (scores.length) {
      out.appetite = AMOUNT_ORDER[Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)];
      used.push("las comidas del día");
    }
  }

  const q = (sleep.data as { quality: string | null } | null)?.quality;
  if (!sleep.error && q) {
    out.sleep = q;
    used.push("el sueño de la noche anterior");
  }
  return out;
}

const KNOWN = ["Solo se pueden", "Con tu rol", "Esos datos"];
export function nbError(e: { message?: string; code?: string } | null) {
  if (!e) return "";
  if (e.code === "23505") return "Ya escribiste en el cuaderno de ese día. Recarga para editar tu nota.";
  if (e.code === "23514") return "Elige o escribe algo antes de guardar.";
  if (e.message && KNOWN.some((k) => e.message!.startsWith(k))) return e.message;
  return "No se pudo guardar. Revisa tus permisos e intenta de nuevo.";
}