import { hhmm, isoWeekday, localDate } from "@/lib/routines";
import { atTime, type Dose, type Med } from "@/lib/meds";
import type { WellbeingSummary } from "@/lib/wellbeing";

export const PERIODS = [7, 30, 90];

export type Hist = {
  medication_id: string;
  as_needed: boolean;
  times: string[];
  days: number[];
  valid_from: string;
  valid_to: string | null;
};

export type AdherenceRow = {
  name: string;
  scheduled: number;
  given: number;
  omitted: number;
  unrecorded: number;
  postponed: number;
  voided: number;
};

export type PrnRow = { name: string; count: number; recent: string[] };

export type ReportData = {
  childName: string;
  age: string;
  generatedAt: string;
  days: number;
  fromLabel: string;
  toLabel: string;
  include: {
    child: boolean;
    meds: boolean;
    adherence: boolean;
    mood: boolean;
    observations: boolean;
    goals: boolean;
      wellbeing: boolean;
    notes: boolean;
  };
  allergies: { substance: string; severity: string; reaction: string | null }[];
  conditions: string | null;
  meds: { name: string; dose: string | null; schedule: string }[];
  adherence: AdherenceRow[];
  prn: PrnRow[];
  moods: { label: string; n: number }[];
  moodDays: number;
  moodTotal: number;
  wellbeing: WellbeingSummary;
  observations: { when: string; who: string; category: string; text: string }[];
  goals: { title: string; status: string; progress: number }[];
  notes: { when: string; med: string; status: string; note: string }[];
  questions: string;
};

export const fmtDay = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Cumplimiento: para cada día del periodo se usa el horario que la medicina tenía ESE día
 * (por el historial de horarios). Una toma cuenta cuando ya pasaron su hora y su margen.
 */
export function adherence(meds: Med[], hist: Hist[], doses: Dose[], from: Date, now: Date) {
  const rows: AdherenceRow[] = [];
  const prn: PrnRow[] = [];
  const nowMs = now.getTime();
  const fromMs = from.getTime();
  const lastDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  for (const med of meds) {
    const h = hist.filter((x) => x.medication_id === med.id);
    const mine = doses.filter((d) => d.medication_id === med.id);
    const live = mine.filter((d) => !d.voided_at);
    const voided = mine.filter((d) => d.voided_at && new Date(d.recorded_at).getTime() >= fromMs).length;

    let scheduled = 0;
    let given = 0;
    let omitted = 0;
    let unrecorded = 0;
    let postponed = 0;

    for (let i = 0; ; i++) {
      const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      if (day.getTime() > lastDay) break;

      const dayStart = day.getTime();
      const dayEnd = dayStart + 86400000 - 1;
      const row = h
        .filter(
          (x) =>
            new Date(x.valid_from).getTime() <= dayEnd &&
            (!x.valid_to || new Date(x.valid_to).getTime() > dayStart)
        )
        .sort((a, b) => b.valid_from.localeCompare(a.valid_from))[0];
      if (!row || row.as_needed) continue;

      const dayStr = localDate(day);
      if (med.started_on && med.started_on > dayStr) continue;
      if (med.ends_on && med.ends_on < dayStr) continue;
      if (!row.days.includes(isoWeekday(day))) continue;

      for (const t of row.times) {
        const time = hhmm(t);
        if (atTime(time, day).getTime() + med.grace_min * 60000 > nowMs) continue; // todavía no vence
        scheduled++;
        const slot = live.filter(
          (d) => d.kind === "programada" && d.scheduled_date === dayStr && hhmm(d.scheduled_time) === time
        );
        if (slot.some((d) => d.status === "pospuesta")) postponed++;
        if (slot.some((d) => d.status === "dada")) given++;
        else if (slot.some((d) => d.status === "omitida")) omitted++;
        else unrecorded++;
      }
    }

    if (scheduled > 0 || voided > 0) {
      rows.push({ name: med.name, scheduled, given, omitted, unrecorded, postponed, voided });
    }

    if (med.as_needed || h.some((x) => x.as_needed)) {
      const taken = live
        .filter((d) => d.kind === "necesaria" && d.taken_at && new Date(d.taken_at).getTime() >= fromMs)
        .sort((a, b) => (b.taken_at ?? "").localeCompare(a.taken_at ?? ""));
      prn.push({
        name: med.name,
        count: taken.length,
        recent: taken.slice(0, 8).map((d) => fmtDateTime(d.taken_at!)),
      });
    }
  }
  return { rows, prn };
}