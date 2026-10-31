export type FontScale = "normal" | "grande" | "muy-grande";
export type Palette = "bosque" | "oceano" | "arena" | "lavanda" | "coral";

export type Settings = {
  fontScale: FontScale;
  contrast: "normal" | "alto";
  calm: boolean;
  theme: "claro" | "oscuro" | "auto";
  font: "normal" | "legible";
  palette: Palette;
};

export const PALETTES: { id: Palette; label: string; swatch: string }[] = [
  { id: "bosque", label: "Bosque", swatch: "#426f5d" },
  { id: "oceano", label: "Océano", swatch: "#3f6f8a" },
  { id: "arena", label: "Arena", swatch: "#7d6219" },
  { id: "lavanda", label: "Lavanda", swatch: "#6a5a86" },
  { id: "coral", label: "Coral", swatch: "#9a4f4f" },
];

export const KEY = "pap:settings";

// Si el sistema pide menos movimiento, el modo calma arranca activado
export function systemDefaults(): Settings {
  const calm =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return {
    fontScale: "normal",
    contrast: "normal",
    calm,
    theme: "auto",
    font: "normal",
    palette: "bosque",
  };
}

export function readLocal(): Settings | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...systemDefaults(), ...JSON.parse(raw) } : null;
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
d.dataset.palette=(s&&s.palette)||'bosque';
d.dataset.theme=dark?'oscuro':'claro';
d.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;