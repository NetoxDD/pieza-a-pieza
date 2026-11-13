export const KID_MOODS = [
  { mood: "Contento", emoji: "😊", label: "Contento" },
  { mood: "Tranquilo", emoji: "😌", label: "Tranquilo" },
  { mood: "Neutro", emoji: "😐", label: "Normal" },
  { mood: "Incómodo", emoji: "😣", label: "Incómodo" },
  { mood: "Triste", emoji: "😢", label: "Triste" },
  { mood: "Frustrado", emoji: "😠", label: "Enojado" },
] as const;

// Si un paso no tiene emoji propio, se elige uno por palabras
const KEYWORDS: [RegExp, string][] = [
  [/dient|cepill/i, "🪥"],
  [/desayun/i, "🥣"],
  [/comer|comida|almuerz|cena/i, "🍽️"],
  [/vest|ropa/i, "👕"],
  [/mochila|escuel|cole/i, "🎒"],
  [/autob|transporte|cami[oó]n/i, "🚌"],
  [/ba[ñn]o|duch/i, "🛁"],
  [/dorm|sue[ñn]o|cama/i, "😴"],
  [/leer|cuento|libro/i, "📚"],
  [/jug/i, "🧸"],
  [/tarea/i, "✏️"],
  [/manos/i, "🧼"],
  [/zapat/i, "👟"],
  [/merienda|colaci/i, "🍎"],
];

export const stepEmoji = (title: string, emoji: string | null) =>
  emoji || KEYWORDS.find(([re]) => re.test(title))?.[1] || "⭐";

// ---------- PIN de adulto (solo en este dispositivo) ----------
const key = (uid: string) => `pap:kidpin:${uid}`;

export function hasPin(uid: string) {
  try {
    return !!localStorage.getItem(key(uid));
  } catch {
    return false;
  }
}

async function hashPin(uid: string, pin: string) {
  const data = new TextEncoder().encode(`pap-kid:${uid}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function savePin(uid: string, pin: string) {
  localStorage.setItem(key(uid), await hashPin(uid, pin));
}

export async function checkPin(uid: string, pin: string) {
  try {
    return localStorage.getItem(key(uid)) === (await hashPin(uid, pin));
  } catch {
    return false;
  }
}

export function clearPin(uid: string) {
  try {
    localStorage.removeItem(key(uid));
  } catch {
    /* sin almacenamiento */
  }
}