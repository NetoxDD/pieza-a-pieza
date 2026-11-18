import { hhmm, isoWeekday, localDate } from "@/lib/routines";
import { atTime,type SlotRow, type Dose, type Med } from "@/lib/meds";
import type { WellbeingSummary } from "@/lib/wellbeing";
import type { EpisodeSummary } from "@/lib/patterns";

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
    episodes: boolean;
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
  episodes: EpisodeSummary;
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
/**
 * Cumplimiento: usa las tomas que decide la base de datos para cada día.
 * Una toma cuenta cuando ya pasaron su hora y su margen.
 */
export function adherence(meds: Med[], slots: SlotRow[], doses: Dose[], from: Date, now: Date) {
  const rows: AdherenceRow[] = [];
  const prn: PrnRow[] = [];
  const nowMs = now.getTime();
  const fromMs = from.getTime();
  const fromStr = localDate(from);
  const todayStr = localDate(now);

  for (const med of meds) {
    const mine = doses.filter((d) => d.medication_id === med.id);
    const live = mine.filter((d) => !d.voided_at);
    const voided = mine.filter((d) => d.voided_at && new Date(d.recorded_at).getTime() >= fromMs).length;

    let scheduled = 0;
    let given = 0;
    let omitted = 0;
    let unrecorded = 0;
    let postponed = 0;

    for (const s of slots) {
      if (s.medication_id !== med.id || s.slot_date < fromStr || s.slot_date > todayStr) continue;
      const [y, m, d] = s.slot_date.split("-").map(Number);
      if (atTime(s.slot_time, new Date(y, m - 1, d)).getTime() + med.grace_min * 60000 > nowMs) continue; // todavía no vence
      scheduled++;
      const slot = live.filter(
        (x) =>
          x.kind === "programada" && x.scheduled_date === s.slot_date && hhmm(x.scheduled_time) === s.slot_time
      );
      if (slot.some((x) => x.status === "pospuesta")) postponed++;
      if (slot.some((x) => x.status === "dada")) given++;
      else if (slot.some((x) => x.status === "omitida")) omitted++;
      else unrecorded++;
    }

    if (scheduled > 0 || voided > 0) {
      rows.push({ name: med.name, scheduled, given, omitted, unrecorded, postponed, voided });
    }

    if (med.as_needed || mine.some((d) => d.kind === "necesaria")) {
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