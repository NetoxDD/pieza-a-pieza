export type FontScale = "normal" | "grande" | "muy-grande";
export type Palette = "calida" | "clara" | "ludica";

export type Settings = {
  fontScale: FontScale;
  contrast: "normal" | "alto";
  calm: boolean;
  theme: "claro" | "oscuro" | "auto";
  font: "normal" | "legible";
  alerts: boolean;
  palette: Palette;
};

export const PALETTES: { id: Palette; label: string; hint: string; colors: [string, string, string] }[] = [
  { id: "calida", label: "Cálida y calmada", hint: "Tonos suaves y letra con calidez.", colors: ["#f6f2e9", "#3f5e45", "#cdb574"] },
  { id: "clara", label: "Clara y profesional", hint: "Limpia, sobria y muy ordenada.", colors: ["#f3f6f8", "#2c566e", "#bccfdb"] },
  { id: "ludica", label: "Lúdica", hint: "Redondeada y con colores alegres.", colors: ["#fff8e8", "#34553a", "#a3b899"] },
];

// Los nombres de las paletas anteriores se convierten a los temas nuevos
export function normalizePalette(p: unknown): Palette {
  if (p === "calida" || p === "clara" || p === "ludica") return p;
  if (p === "oceano") return "clara";
  return "calida";
}

export const KEY = "pap:settings";

// Si el sistema pide menos movimiento, el modo calma arranca activado
export function systemDefaults(): Settings {
  const calm =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    fontScale: "normal",
    contrast: "normal",
    alerts: true,
    calm,
    theme: "auto",
    font: "normal",
    palette: "calida",
  };
}

export function readLocal(): Settings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = { ...systemDefaults(), ...JSON.parse(raw) };
    s.palette = normalizePalette(s.palette);
    return s;
  } catch {
    return null;
  }
}

export function writeLocal(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento disponible: no pasa nada */
  }
}

export function applySettings(s: Settings) {
  const el = document.documentElement;
  const dark =
    s.theme === "oscuro" ||
    (s.theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  el.dataset.fontscale = s.fontScale;
  el.dataset.contrast = s.contrast;
  el.dataset.calm = s.calm ? "si" : "no";
  el.dataset.font = s.font;
  el.dataset.palette = s.palette;
  el.dataset.theme = dark ? "oscuro" : "claro";
  el.style.colorScheme = dark ? "dark" : "light";
}

// Se ejecuta antes de pintar la página, para evitar parpadeos
export const INIT_SCRIPT = `(function(){try{
var d=document.documentElement,s=null;
try{s=JSON.parse(localStorage.getItem('${KEY}')||'null')}catch(e){}
var mq=function(q){return window.matchMedia&&window.matchMedia(q).matches};
var calm=s?!!s.calm:mq('(prefers-reduced-motion: reduce)');
var theme=(s&&s.theme)||'auto';
var dark=theme==='oscuro'||(theme==='auto'&&mq('(prefers-color-scheme: dark)'));
d.dataset.fontscale=(s&&s.fontScale)||'normal';
d.dataset.contrast=(s&&s.contrast)||'normal';
d.dataset.calm=calm?'si':'no';
d.dataset.font=(s&&s.font)||'normal';
d.dataset.palette=(['calida','clara','ludica'].indexOf(s&&s.palette)>-1?s.palette:(s&&s.palette==='oceano'?'clara':'calida'));
d.dataset.theme=dark?'oscuro':'claro';
d.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;