export type MaterialKind = "archivo" | "enlace" | "actividad";

export type Material = {
  id: string;
  author_id: string;
  kind: MaterialKind;
  title: string;
  description: string | null;
  category: string;
  audience: "todos" | "familia";
  url: string | null;
  steps: string | null;
  duration_min: number | null;
  mime: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  thumb_path: string | null;
  pinned: boolean;
  created_at: string;
};

export const CATEGORIES = [
  { value: "comunicacion", label: "Comunicación" },
  { value: "rutinas", label: "Rutinas" },
  { value: "calma", label: "Calma" },
  { value: "escuela", label: "Escuela" },
  { value: "hogar", label: "Hogar" },
  { value: "otra", label: "Otra" },
];

export const categoryLabel: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

export const kindLabel: Record<string, string> = {
  archivo: "Archivo",
  enlace: "Enlace",
  actividad: "Actividad",
};

export const PUBLISH_ROLES = ["familia", "pediatra", "terapeuta", "logopeda", "tutor"];

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Solo se aceptan direcciones https. Si falta el prefijo, se agrega.
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const full = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(full);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}