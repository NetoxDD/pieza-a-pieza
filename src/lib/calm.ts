export type CalmKind = "senal" | "ayuda" | "evitar" | "pedir_ayuda" | "detonante";

export type CalmItem = { id: string; kind: CalmKind; body: string; position: number };

export const CALM_COLS = "id,kind,body,position";
export const MAX_ITEMS = 12;

export const CALM_KINDS: {
  key: CalmKind;
  title: string;
  hint: string;
  placeholder: string;
  ordered?: boolean;
}[] = [
  {
    key: "senal",
    title: "Señales tempranas",
    hint: "Lo que se nota antes de que se complique.",
    placeholder: "Ej. Se tapa los oídos",
  },
  {
    key: "ayuda",
    title: "Qué ayuda (en este orden)",
    hint: "Lo primero que se intenta y, si no basta, lo siguiente.",
    placeholder: "Ej. Bajar la voz y ofrecerle sus audífonos",
    ordered: true,
  },
  {
    key: "evitar",
    title: "Qué evitar",
    hint: "Lo que suele empeorar las cosas.",
    placeholder: "Ej. Tocarlo sin avisar",
  },
  {
    key: "pedir_ayuda",
    title: "Cuándo pedir ayuda",
    hint: "En qué situaciones avisar a la familia o a un profesional.",
    placeholder: "Ej. Si se lastima o no responde",
  },
  {
    key: "detonante",
    title: "Detonantes conocidos",
    hint: "Situaciones que suelen costarle.",
    placeholder: "Ej. Cambios de última hora en la rutina",
  },
];

// Lo que se muestra en la ficha de emergencia (los contactos ya salen allí)
export const EMERGENCY_ORDER: CalmKind[] = ["senal", "ayuda", "evitar", "pedir_ayuda", "detonante"];

export const kindMeta = (k: string) => CALM_KINDS.find((x) => x.key === k);

export type CalmGroup = { kind: CalmKind; title: string; ordered: boolean; items: string[] };

// Agrupa los elementos guardados en la ficha de emergencia, en el orden de lectura
export function groupCalm(calm: { kind: string; body: string }[] | null | undefined): CalmGroup[] {
  if (!calm) return [];
  return EMERGENCY_ORDER.map((k) => {
    const meta = kindMeta(k)!;
    return {
      kind: k,
      title: meta.title,
      ordered: !!meta.ordered,
      items: calm.filter((x) => x.kind === k).map((x) => x.body),
    };
  }).filter((g) => g.items.length > 0);
}