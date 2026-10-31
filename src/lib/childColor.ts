const NAMED: Record<string, { label: string; bg: string; fg: string; bar: string }> = {
  verde: { label: "Verde", bg: "#e7f0e6", fg: "#426f5d", bar: "#9dbba9" },
  azul: { label: "Azul", bg: "#e8f1f5", fg: "#4d6d83", bar: "#9db9cb" },
  mostaza: { label: "Mostaza", bg: "#f4e8c4", fg: "#74613d", bar: "#d4b66a" },
  lila: { label: "Lila", bg: "#ece6f3", fg: "#6a5a86", bar: "#b5a5d0" },
  rosa: { label: "Rosa", bg: "#f6e4e4", fg: "#8a4f4f", bar: "#d9a3a3" },
};

const ORDER = Object.keys(NAMED);

export const ACCENTS = ORDER.map((id) => ({ id, ...NAMED[id] }));

// Si la familia eligió un color, se usa; si no, cada niño recibe uno estable
export function childColor(id: string, accent?: string | null) {
  if (accent && NAMED[accent]) return NAMED[accent];
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return NAMED[ORDER[sum % ORDER.length]];
}

export function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}