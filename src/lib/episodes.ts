export const PLACES = [
  { key: "casa", label: "Casa" },
  { key: "escuela", label: "Escuela" },
  { key: "calle", label: "Calle" },
  { key: "transporte", label: "Transporte" },
  { key: "consulta", label: "Consulta" },
  { key: "otro", label: "Otro" },
] as const;

export const INTENSITY = [
  { key: 1, label: "Leve" },
  { key: 2, label: "Moderada" },
  { key: 3, label: "Fuerte" },
] as const;

export type Episode = {
  id: string;
  author_id: string;
  occurred_at: string;
  place: string;
  antecedent: string | null;
  behavior: string;
  consequence: string | null;
  intensity: number;
  duration_minn: number | null;
  helped: string[];
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
  created_at: string;
};

export const EP_COLS =
  "id,author_id,occurred_at,place,antecedent,behavior,consequence,intensity,duration_minn,helped,voided_at,voided_by,void_reason,created_at";

export const placeLabel = (k: string) => PLACES.find((p) => p.key === k)?.label ?? k;
export const intensityLabel = (n: number) => INTENSITY.find((i) => i.key === n)?.label ?? String(n);

// Quien lo anotó puede editarlo y anularlo durante 24 horas
export const WINDOW_MS = 24 * 60 * 60 * 1000;
export const inWindow = (e: Episode) => Date.now() - new Date(e.created_at).getTime() < WINDOW_MS;

const pad = (n: number) => String(n).padStart(2, "0");
export const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const KNOWN = [
  "La fecha",
  "Los episodios",
  "Esa fecha",
  "Solo quien",
  "Solo se puede",
  "Solo la familia",
  "Este episodio",
  "Esos datos",
  "Escribe el motivo",
  "Episodio no encontrado",
  "Inicia sesión",
];

export function epError(e: { message?: string } | null, fallback = "No se pudo guardar. Revisa tus permisos e intenta de nuevo.") {
  return e?.message && KNOWN.some((k) => e.message!.startsWith(k)) ? e.message : fallback;
}

export function durationText(min: number | null) {
  if (min === null) return "";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}