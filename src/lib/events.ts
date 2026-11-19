import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/ficha";

export type RepeatKind = "none" | "daily" | "weekly" | "monthly";

export type Occ = {
  event_id: string;
  occ_date: string;
  event_time: string | null;
  title: string;
  detail: string | null;
  created_by: string;
  repeat_kind: RepeatKind;
  repeat_every: number;
  repeat_days: number[];
  repeat_until: string | null;
  series_start: string;
};

export type EvRow = {
  id: string;
  event_date: string;
  event_time: string | null;
  title: string;
  detail: string | null;
  repeat_kind: RepeatKind;
  repeat_every: number;
  repeat_days: number[];
  repeat_until: string | null;
};
export const EV_COLS =
  "id,event_date,event_time,title,detail,repeat_kind,repeat_every,repeat_days,repeat_until";

export const WD = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
export const MAX_EVERY: Record<Exclude<RepeatKind, "none">, number> = { daily: 30, weekly: 8, monthly: 12 };

const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const isoDow = (s: string) => ((parse(s).getDay() + 6) % 7) + 1;

// null = no se pudo cargar
export async function fetchOccurrences(childId: string, from: string, to: string): Promise<Occ[] | null> {
  const { data, error } = await supabase.rpc("event_occurrences", { cid: childId, d_from: from, d_to: to });
  if (error) return null;
  return (data as (Omit<Occ, "repeat_every" | "repeat_days"> & { repeat_every: number | string; repeat_days: number[] | null })[]).map(
    (r) => ({
      ...r,
      event_time: r.event_time ? r.event_time.slice(0, 5) : null,
      repeat_every: Number(r.repeat_every),
      repeat_days: r.repeat_days ?? [],
    })
  );
}

export function repeatText(
  kind: RepeatKind,
  every: number,
  days: number[],
  until: string | null,
  start: string
): string {
  if (kind === "none") return "";
  let base = "";
  if (kind === "daily") base = every === 1 ? "Todos los días" : `Cada ${every} días`;
  if (kind === "weekly") {
    const d = days.length ? days : [isoDow(start)];
    base = `${every === 1 ? "Cada semana" : `Cada ${every} semanas`} (${d.map((x) => WD[x - 1]).join(", ")})`;
  }
  if (kind === "monthly") {
    base = `${every === 1 ? "Cada mes" : `Cada ${every} meses`}, el día ${Number(start.slice(8))}`;
  }
  return until ? `${base} hasta el ${formatDate(until)}` : base;
}

const KNOWN = [
  "Esa fecha",
  "La serie",
  "Se alcanzó",
  "Solo quien",
  "Este encuentro",
  "Para quitar",
  "El título",
  "El detalle",
];
export const evError = (e: { message?: string } | null, fallback = "No se pudo guardar. Intenta de nuevo.") =>
  e?.message && KNOWN.some((k) => e.message!.startsWith(k)) ? e.message : fallback;

// ---------- Exportar a .ics ----------
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (iso: string) => iso.replaceAll("-", "");
const hms = (t: string) => `${t.slice(0, 2)}${t.slice(3, 5)}00`;
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function endLocal(date: string, time: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const e = new Date(y, m - 1, d, Number(time.slice(0, 2)), Number(time.slice(3, 5)) + minutes);
  return `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
}
function nextDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const e = new Date(y, m - 1, d + 1);
  return `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}`;
}

// Las líneas largas se parten a 75 bytes, como pide el formato
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 75) {
      out.push(cur);
      cur = ` ${ch}`;
      bytes = 1 + b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  out.push(cur);
  return out.join("\r\n");
}

const DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

export function buildIcs(
  rows: EvRow[],
  exceptions: { event_id: string; occ_date: string }[],
  opts: { alarm: boolean }
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pieza a pieza//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Pieza a pieza",
  ];
  for (const r of rows) {
    const timed = !!r.event_time;
    const t = r.event_time ?? "";
    lines.push("BEGIN:VEVENT", `UID:${r.id}@pieza-a-pieza`, `DTSTAMP:${stamp()}`);
    if (timed) {
      lines.push(`DTSTART:${ymd(r.event_date)}T${hms(t)}`, `DTEND:${endLocal(r.event_date, t, 60)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${ymd(r.event_date)}`, `DTEND;VALUE=DATE:${nextDay(r.event_date)}`);
    }
    lines.push(`SUMMARY:${esc(r.title)}`);
    if (r.detail) lines.push(`DESCRIPTION:${esc(r.detail)}`);

    if (r.repeat_kind !== "none") {
      const freq = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY" }[r.repeat_kind];
      let rule = `FREQ=${freq};INTERVAL=${r.repeat_every}`;
      if (r.repeat_kind === "weekly") {
        const days = r.repeat_days.length ? r.repeat_days : [isoDow(r.event_date)];
        rule += `;BYDAY=${days.map((d) => DAYS[d - 1]).join(",")};WKST=MO`;
      }
      if (r.repeat_until) rule += `;UNTIL=${ymd(r.repeat_until)}${timed ? "T235959" : ""}`;
      lines.push(`RRULE:${rule}`);
      for (const x of exceptions.filter((e) => e.event_id === r.id)) {
        lines.push(timed ? `EXDATE:${ymd(x.occ_date)}T${hms(t)}` : `EXDATE;VALUE=DATE:${ymd(x.occ_date)}`);
      }
    }
    if (opts.alarm && timed) {
      lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Recordatorio", "TRIGGER:-PT30M", "END:VALARM");
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function downloadText(text: string, filename: string, mime = "text/calendar;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}