export type ChildProfile = {
  birth_date: string | null;
  sex: "femenino" | "masculino" | "no-indicar" | null;
  avatar_kind: "preset" | "photo";
  avatar_preset: string;
  avatar_path: string | null;
  blood_type: string | null;
  emergency_number: string | null;
  helps_text: string | null;
  health_consent_at: string | null;
};

export type Allergy = {
  id: string;
  substance: string;
  kind: "alimento" | "medicamento" | "ambiental" | "otra";
  reaction: string | null;
  severity: "leve" | "moderada" | "grave";
};

export type Contact = {
  id: string;
  kind: "familiar" | "pediatra" | "hospital" | "escuela" | "otro";
  name: string;
  relation: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_emergency: boolean;
};

export const sexLabel: Record<string, string> = {
  femenino: "Femenino",
  masculino: "Masculino",
  "no-indicar": "Prefiero no indicar",
};

export const allergyKindLabel: Record<string, string> = {
  alimento: "Alimento",
  medicamento: "Medicamento",
  ambiental: "Ambiental",
  otra: "Otra",
};

export const contactKindLabel: Record<string, string> = {
  familiar: "Familiar",
  pediatra: "Pediatra",
  hospital: "Hospital o clínica",
  escuela: "Escuela",
  otro: "Otro",
};

export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function ageText(birth: string | null): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - (m - 1));
  if (now.getDate() < d) months -= 1;
  if (months < 0) return "";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} ${rest === 1 ? "mes" : "meses"}`;
  const y1 = `${years} ${years === 1 ? "año" : "años"}`;
  return rest === 0 ? y1 : `${y1} y ${rest} ${rest === 1 ? "mes" : "meses"}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;