const PALETTE = [
  { bg: "#e7f0e6", fg: "#426f5d", bar: "#9dbba9" }, // verde
  { bg: "#e8f1f5", fg: "#4d6d83", bar: "#9db9cb" }, // azul
  { bg: "#f4e8c4", fg: "#74613d", bar: "#d4b66a" }, // mostaza
  { bg: "#ece6f3", fg: "#6a5a86", bar: "#b5a5d0" }, // lila
  { bg: "#f6e4e4", fg: "#8a4f4f", bar: "#d9a3a3" }, // rosa
];

// El mismo niño siempre recibe el mismo color
export function childColor(id: string) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return PALETTE[sum % PALETTE.length];
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