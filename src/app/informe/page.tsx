"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import ReportView from "@/components/report/ReportView";
import { PERIODS, adherence, fmtDay, type Hist, type ReportData } from "@/lib/report";
import { DOSE_COLS, MED_COLS, scheduleText, statusLabel, type Dose, type Med } from "@/lib/meds";
import { ageText } from "@/lib/ficha";
import { localDate } from "@/lib/routines";
import { summarizeWellbeing } from "@/lib/wellbeing";

const MOODS = ["Contento", "Tranquilo", "Neutro", "Incómodo", "Triste", "Frustrado"];

const SECTIONS = [
  { key: "child", label: "Datos del niño y alergias" },
  { key: "meds", label: "Medicinas actuales" },
  { key: "adherence", label: "Registro de tomas" },
  { key: "mood", label: "Estado de ánimo" },
     { key: "wellbeing", label: "Sueño y comidas" },
  { key: "observations", label: "Observaciones que marqué para el informe" },
  { key: "goals", label: "Objetivos y avance" },
  { key: "notes", label: "Notas de las dosis" },
] as const;

type Key = (typeof SECTIONS)[number]["key"];

export default function Informe() {
  const { child, role } = useChild();
  const { profile, allergies, conditions } = useChildProfile();
  const { get } = useProfiles();

  const [days, setDays] = useState(30);
  const [include, setInclude] = useState<Record<Key, boolean>>({
    child: true,
    meds: true,
    adherence: true,
    mood: true,
    wellbeing: true,
    observations: true,
    goals: true,
    notes: false,
  });
  const [questions, setQuestions] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ReportData | null>(null);

  if (role !== "familia") {
    return (
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Informe para el pediatra</h1>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Solo la familia genera el informe. Si lo necesitas, pídeselo a ella.
        </p>
      </div>
    );
  }

  const log = (act: "generado" | "impreso") =>
    supabase.rpc("log_report", { cid: child.id, act, days, secs: include }).then(
      () => {},
      () => {}
    );

  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
      const fromIso = from.toISOString();
      const fromStr = localDate(from);

      const [m, h, d, mood, obs, goals] = await Promise.all([
        supabase.from("child_medications").select(MED_COLS).eq("child_id", child.id),
        supabase
          .from("med_schedule_history")
          .select("medication_id,as_needed,times,days,valid_from,valid_to")
          .eq("child_id", child.id),
        supabase
          .from("med_doses")
          .select(DOSE_COLS)
          .eq("child_id", child.id)
          .or(`scheduled_date.gte.${fromStr},taken_at.gte.${fromIso},recorded_at.gte.${fromIso}`),
        supabase.from("mood_logs").select("mood,created_at").eq("child_id", child.id).gte("created_at", fromIso),
        supabase
          .from("observations")
          .select("id,author_id,category,body,created_at,tags")
          .eq("child_id", child.id)
          .eq("include_in_report", true)
          .gte("created_at", fromIso)
          .order("created_at", { ascending: false }),
        supabase.from("goals").select("title,status,progress").eq("child_id", child.id).order("created_at"),
      ]);
      if ([m, h, d, mood, obs, goals].some((r) => r.error)) throw new Error("db");

      const meds = m.data as Med[];
      const doses = d.data as Dose[];
      const ad = adherence(meds, h.data as Hist[], doses, from, now);

      const moodRows = mood.data as { mood: string; created_at: string }[];
      const moodDays = new Set(moodRows.map((x) => localDate(new Date(x.created_at)))).size;

      const nameOf = (id: string) => meds.find((x) => x.id === id)?.name ?? "Medicina";
      const inPeriod = (x: Dose) =>
        (x.scheduled_date && x.scheduled_date >= fromStr) ||
        (x.taken_at && new Date(x.taken_at).getTime() >= from.getTime());
           const [sl, ml] = await Promise.all([
     supabase.from("sleep_logs").select("sleep_minutes,wakeups,quality").eq("child_id", child.id).gte("night_of", fromStr),
     supabase.from("meal_logs").select("meal,amount").eq("child_id", child.id).gte("day", fromStr),
   ]);
   const wellbeing = summarizeWellbeing(
     (sl.data ?? []) as { sleep_minutes: number; wakeups: number; quality: string | null }[],
     (ml.data ?? []) as { meal: string; amount: string }[]
   );

      const data: ReportData = {
        childName: child.name,
        age: ageText(profile?.birth_date ?? null),
        generatedAt: fmtDay(now),
        days,
        fromLabel: fmtDay(from),
        toLabel: fmtDay(now),
        include,
        allergies: allergies.map((a) => ({ substance: a.substance, severity: a.severity, reaction: a.reaction })),
        conditions,
        meds: meds
          .filter((x) => x.active)
          .map((x) => ({ name: x.name, dose: x.dose, schedule: scheduleText(x) })),
        adherence: ad.rows,
        prn: ad.prn,
        moods: MOODS.map((label) => ({ label, n: moodRows.filter((x) => x.mood === label).length })),
        moodDays,
        moodTotal: moodRows.length,
        wellbeing,
        observations: (obs.data as { author_id: string; category: string; body: string; created_at: string;tags: string[] | null;}[]).map(
          (o) => ({
            when: new Date(o.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
            who: get(o.author_id)?.name ?? "Alguien del equipo",
               category: o.tags?.length ? `${o.category} · ${o.tags.join(", ")}` : o.category,
            text: o.body,
          })
        ),
        goals: (goals.data as { title: string; status: string; progress: number }[]).map((g) => ({
          title: g.title,
          status: g.status,
          progress: g.progress,
        })),
        notes: doses
          .filter((x) => !x.voided_at && x.note && inPeriod(x))
          .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))
          .map((x) => ({
            when: new Date(x.taken_at ?? x.recorded_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
            med: nameOf(x.medication_id),
            status: statusLabel[x.status],
            note: x.note ?? "",
          })),
        questions,
      };

      setPreview(data);
      log("generado");
    } catch {
      setError("No se pudo preparar el informe. Revisa tu conexión e intenta de nuevo.");
    }
    setBusy(false);
  };

  const chip = (active: boolean) =>
    `flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Informe para el pediatra</h1>
        <p className="mt-1 text-[var(--muted)]">
          Un resumen de lo que ha registrado el equipo de {child.name}, para llevar a la consulta.
        </p>
      </div>

      <section className="grid gap-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold">Periodo</legend>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <label key={p} className={chip(days === p)}>
                <input
                  type="radio"
                  name="period"
                  checked={days === p}
                  onChange={() => setDays(p)}
                  className="sr-only"
                />
                Últimos {p} días
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-1">
          <legend className="text-sm font-semibold">Qué incluir</legend>
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={include[s.key]}
                onChange={(e) => setInclude({ ...include, [s.key]: e.target.checked })}
                className="h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              {s.label}
            </label>
          ))}
          <p className="text-xs text-[var(--muted)]">
            Las observaciones solo entran si las marcaste con «Incluir en el informe» en Día a día →
            Observaciones. Las rutinas nunca se incluyen.
          </p>
        </fieldset>

        <label className="grid gap-1.5 text-xs font-semibold">
          Preguntas para la consulta (opcional)
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            maxLength={1500}
            rows={4}
            placeholder="Ej. ¿Cuánto tiempo más tomará esta medicina?"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div>
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? "Preparando…" : "Ver vista previa"}
          </button>
        </div>
      </section>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        El informe lo genera la familia a partir de sus registros: no es un diagnóstico ni un documento
        médico. Al imprimirlo o guardarlo en PDF queda fuera de la app: cuida con quién lo compartes. Cada
        informe queda anotado en el historial, sin guardar su contenido. Proyecto escolar: usa datos de
        ejemplo.
      </div>

      {preview && (
        <ReportView
          data={preview}
          onClose={() => setPreview(null)}
          onPrint={() => {
            log("impreso");
            window.print();
          }}
        />
      )}
    </div>
  );
}