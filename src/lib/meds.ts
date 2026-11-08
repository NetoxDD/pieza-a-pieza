import { daysText, hhmm, isoWeekday, localDate } from "@/lib/routines";

export type Med = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  category: string;
  started_on: string | null;
  ends_on: string | null;
  active: boolean;
  as_needed: boolean;
  times: string[];
  days: number[];
  grace_min: number;
  min_interval_hours: number | null;
  document_id: string | null;
  stock_enabled: boolean;
  units_per_dose: number;
  units_per_box: number | null;
  refill_alert_days: number;
};

export type Dose = {
  id: string;
  medication_id: string;
  kind: "programada" | "necesaria";
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: "dada" | "omitida" | "pospuesta";
  taken_at: string | null;
  postponed_until: string | null;
  note: string | null;
  recorded_by: string;
  recorded_at: string;
  voided_at: string | null;
  void_reason: string | null;
};

export const MED_COLS =
  "id,name,dose,frequency,category,started_on,ends_on,active,as_needed,times,days,grace_min,min_interval_hours,document_id,stock_enabled,units_per_dose,units_per_box,refill_alert_days";
export const DOSE_COLS =
  "id,medication_id,kind,scheduled_date,scheduled_time,status,taken_at,postponed_until,note,recorded_by,recorded_at,voided_at,void_reason";

// Roles a los que la familia puede dar permiso de registrar (la familia siempre puede)
export const ADMIN_ROLES = ["cuidador", "tutor", "terapeuta", "logopeda"];

export const statusLabel: Record<string, string> = {
  dada: "Dada",
  omitida: "Omitida",
  pospuesta: "Pospuesta",
};

// Combina un día con una hora HH:MM del reloj local
export function atTime(time: string, base: Date = new Date()): Date {
  const [h, m] = time.split(":").map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
}

// ¿Le toca una toma programada a esta medicina en este día?
export function appliesOn(m: Med, date: Date): boolean {
  if (!m.active || m.as_needed) return false;
  const d = localDate(date);
  return (
    m.days.includes(isoWeekday(date)) &&
    (!m.started_on || m.started_on <= d) &&
    (!m.ends_on || m.ends_on >= d)
  );
}

export function agoText(from: Date, to: Date = new Date()): string {
  const mins = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  if (h < 24) return r ? `hace ${h} h ${r} min` : `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

export function scheduleText(m: Med): string {
  if (m.as_needed) return "Solo si es necesario";
  if (m.times.length === 0) return "Sin horarios";
  return `${m.times.map(hhmm).join(", ")} · ${daysText(m.days)}`;
}

// Mensajes de la base de datos que sí se pueden mostrar tal cual
export function doseError(message: string): string {
  const known = [
    "Este medicamento",
    "Esa hora",
    "Ese día",
    "La fecha",
    "Medicamento no encontrado",
    "Escribe el motivo",
    "Solo la familia",
    "Este registro",
    "Registro no encontrado",
    "No tienes acceso",
  ];
  return known.some((k) => message.startsWith(k))
    ? message
    : "No se pudo registrar. Revisa tus permisos e intenta de nuevo.";
}

// ---------- Tomas del día (y las de ayer sin registrar, de las últimas 24 horas) ----------
export type SlotView = {
  med: Med;
  time: string;
  date: string;
  yesterday: boolean;
  resolved: boolean;
  late: boolean;
  due: Date;
};

export function computeSlots(meds: Med[], doses: Dose[], now: Date): SlotView[] {
  const nowMs = now.getTime();
  const live = doses.filter((d) => !d.voided_at);
  const out: SlotView[] = [];

  const days: [Date, boolean][] = [
    [now, false],
    [new Date(nowMs - 86400000), true],
  ];

  for (const [date, yesterday] of days) {
    const dayStr = localDate(date);
    for (const med of meds) {
      if (!appliesOn(med, date)) continue;
      for (const t of med.times) {
        const time = hhmm(t);
        const mine = live.filter(
          (d) =>
            d.medication_id === med.id &&
            d.kind === "programada" &&
            d.scheduled_date === dayStr &&
            hhmm(d.scheduled_time) === time
        );
        const resolved = mine.some((d) => d.status === "dada" || d.status === "omitida");
        const postponed = mine
          .filter((d) => d.status === "pospuesta")
          .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
        const due = atTime(postponed?.postponed_until ? hhmm(postponed.postponed_until) : time, date);

        if (yesterday && (resolved || atTime(time, date).getTime() <= nowMs - 86400000)) continue;

        out.push({
          med,
          time,
          date: dayStr,
          yesterday,
          resolved,
          late: !resolved && nowMs > due.getTime() + med.grace_min * 60000,
          due,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// ---------- Inventario (estimaciones) ----------
export function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Días que alcanzan, según los horarios y las unidades por dosis. Solo es una estimación.
export function estimateDays(med: Med, onHand: number): number | null {
  if (med.as_needed || med.times.length === 0) return null;
  const perDay = (med.times.length * med.days.length) / 7;
  const use = perDay * med.units_per_dose;
  if (use <= 0) return null;
  return Math.max(0, onHand) / use;
}

export function lowStock(med: Med, onHand: number, now: Date = new Date()): { low: boolean; days: number | null } {
  const days = estimateDays(med, onHand);
  if (days === null) return { low: false, days: null };
  let low = days <= med.refill_alert_days;
  // Si el tratamiento termina antes de que se acabe la medicina, no hace falta avisar
  if (low && med.ends_on) {
    const [y, m, d] = med.ends_on.split("-").map(Number);
    const end = new Date(y, m - 1, d).getTime();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const daysToEnd = Math.round((end - start) / 86400000) + 1;
    if (days >= daysToEnd) low = false;
  }
  return { low, days };
}