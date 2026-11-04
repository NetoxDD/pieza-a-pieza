export type Routine = {
  id: string;
  name: string;
  place: "casa" | "escuela" | "ambos";
  days: number[];
  position: number;
  active: boolean;
};

export type Step = {
  id: string;
  routine_id: string;
  title: string;
  at_time: string | null;
  emoji: string | null;
  note: string | null;
  position: number;
};

export const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const placeLabel: Record<string, string> = {
  casa: "Casa",
  escuela: "Escuela",
  ambos: "Casa y escuela",
};

// Quién puede marcar pasos (el pediatra solo ve)
export const MARK_ROLES = ["familia", "terapeuta", "logopeda", "tutor", "cuidador"];

export const EMOJIS = ["🌅", "🍽️", "🪥", "👕", "🎒", "🚌", "📚", "🧸", "🛁", "🕯️", "😴", "🧼"];

const pad = (n: number) => String(n).padStart(2, "0");

// Fecha local del dispositivo, en formato AAAA-MM-DD
export const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// 1 = lunes ... 7 = domingo
export const isoWeekday = (d: Date = new Date()) => ((d.getDay() + 6) % 7) + 1;

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

export function daysText(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 7) return "Todos los días";
  if (sorted.join() === "1,2,3,4,5") return "Lunes a viernes";
  if (sorted.join() === "6,7") return "Fines de semana";
  return sorted.map((d) => DAY_LABELS[d - 1]).join(", ");
}