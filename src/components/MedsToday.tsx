"use client";

import { useCallback, useEffect, useState } from "react";
import { Pill } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import { childColor, initials } from "@/lib/childColor";
import { hhmm, localDate } from "@/lib/routines";
import {
  DOSE_COLS,
  MED_COLS,
  agoText,
  appliesOn,
  atTime,
  doseError,
  type Dose,
  type Med,
} from "@/lib/meds";

type Slot = { med: Med; time: string; date: string; yesterday: boolean };
type Acting =
  | { type: "slot"; slot: Slot; status: "dada" | "omitida" | "pospuesta" }
  | { type: "prn"; med: Med };

const pad = (n: number) => String(n).padStart(2, "0");
const hhmmOf = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const clock = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function MedsToday() {
  const { child } = useChild();
  const { access } = useChildProfile();
  const { get } = useProfiles();
  const color = childColor(child.id, child.accent);
  const visible = access.medications;

  const [meds, setMeds] = useState<Med[]>([]);
  const [doses, setDoses] = useState<Dose[]>([]);
  const [canGive, setCanGive] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const [acting, setActing] = useState<Acting | null>(null);
  const [timeValue, setTimeValue] = useState("");
  const [note, setNote] = useState("");
  const [early, setEarly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!visible) return;
    const m = await supabase
      .from("child_medications")
      .select(MED_COLS)
      .eq("child_id", child.id)
      .eq("active", true)
      .order("created_at");
    if (m.error) {
      setError("No se pudieron cargar las medicinas.");
      setLoaded(true);
      return;
    }
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [d, a] = await Promise.all([
      supabase
        .from("med_doses")
        .select(DOSE_COLS)
        .eq("child_id", child.id)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: false }),
      supabase.rpc("my_administrable", { cid: child.id }),
    ]);
    if (d.error || a.error) {
      setError("No se pudieron cargar las tomas.");
      setLoaded(true);
      return;
    }
    setMeds(m.data as Med[]);
    setDoses(d.data as Dose[]);
    setCanGive(new Set((a.data as { medication_id: string }[]).map((x) => x.medication_id)));
    setNow(new Date());
    setError("");
    setLoaded(true);
  }, [child.id, visible]);

  useEffect(() => {
    load();
  }, [load]);

  // En vivo: cuando alguien registra una dosis, todo el equipo lo ve al instante
  useEffect(() => {
    if (!visible) return;
    const channel = supabase.channel(`meds:${child.id}`);
    ["med_doses", "child_medications"].forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => load());
    });
    channel.subscribe();
    const timer = setInterval(() => {
      setNow(new Date());
      load();
    }, 30000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [child.id, visible, load]);

  if (!visible) return null;
  if (loaded && !error && meds.length === 0) return null;

  const nowMs = now.getTime();
  const yesterdayDate = new Date(nowMs - 86400000);
  const live = doses.filter((d) => !d.voided_at);
  const who = (id: string) => get(id)?.name ?? "alguien del equipo";

  const slotDoses = (s: Slot) =>
    live.filter(
      (d) =>
        d.medication_id === s.med.id &&
        d.kind === "programada" &&
        d.scheduled_date === s.date &&
        hhmm(d.scheduled_time) === s.time
    );
  const resolvedOf = (s: Slot) => slotDoses(s).find((d) => d.status === "dada" || d.status === "omitida");

  const build = (date: Date, yesterday: boolean): Slot[] =>
    meds
      .filter((m) => appliesOn(m, date))
      .flatMap((med) =>
        med.times.map((t) => ({ med, time: hhmm(t), date: localDate(date), yesterday }))
      );

  const todaySlots = build(now, false).sort(
    (a, b) => a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name)
  );
  // Las tomas de ayer que quedaron sin registrar en las últimas 24 horas
  const yesterdaySlots = build(yesterdayDate, true)
    .filter((s) => atTime(s.time, yesterdayDate).getTime() > nowMs - 86400000 && !resolvedOf(s))
    .sort((a, b) => a.time.localeCompare(b.time));

  const prnMeds = meds.filter((m) => m.as_needed);
  const lastPrn = (medId: string) =>
    live
      .filter((d) => d.medication_id === medId && d.kind === "necesaria" && d.taken_at)
      .sort((a, b) => (b.taken_at ?? "").localeCompare(a.taken_at ?? ""))[0];

  const startSlot = (slot: Slot, status: "dada" | "omitida" | "pospuesta") => {
    setActing({ type: "slot", slot, status });
    setTimeValue(status === "pospuesta" ? hhmmOf(new Date(nowMs + 30 * 60000)) : hhmmOf(now));
    setNote("");
    setEarly(false);
    setMsg("");
  };
  const startPrn = (med: Med) => {
    setActing({ type: "prn", med });
    setTimeValue(hhmmOf(now));
    setNote("");
    setEarly(false);
    setMsg("");
  };

  // Aviso de espera mínima (la cifra la escribió la familia; la app solo compara horas)
  const previewMed = acting?.type === "prn" ? acting.med : null;
  const previewLast = previewMed ? lastPrn(previewMed.id) : undefined;
  const hoursSince =
    previewMed && previewLast?.taken_at && timeValue
      ? (atTime(timeValue, now).getTime() - new Date(previewLast.taken_at).getTime()) / 3600000
      : null;
  const tooSoon =
    !!previewMed &&
    previewMed.min_interval_hours != null &&
    hoursSince != null &&
    hoursSince < previewMed.min_interval_hours;

  const submit = async () => {
    if (!acting) return;
    setBusy(true);
    setMsg("");
    const noteValue = note.trim() || null;
    let row: Record<string, unknown>;

    if (acting.type === "prn") {
      const taken = atTime(timeValue, now);
      if (taken.getTime() > nowMs + 10 * 60000) {
        setMsg("La hora no puede ser en el futuro.");
        setBusy(false);
        return;
      }
      row = {
        medication_id: acting.med.id,
        child_id: child.id,
        kind: "necesaria",
        status: "dada",
        taken_at: taken.toISOString(),
        note: noteValue,
      };
    } else {
      const { slot, status } = acting;
      row = {
        medication_id: slot.med.id,
        child_id: child.id,
        kind: "programada",
        scheduled_date: slot.date,
        scheduled_time: slot.time,
        status,
        note: noteValue,
      };
      if (status === "dada") {
        let taken = atTime(timeValue, now);
        // En una toma de ayer, una hora "del futuro" corresponde a la noche anterior
        if (slot.yesterday && taken.getTime() > nowMs + 5 * 60000) {
          taken = atTime(timeValue, new Date(nowMs - 86400000));
        }
        if (taken.getTime() > nowMs + 10 * 60000) {
          setMsg("La hora no puede ser en el futuro.");
          setBusy(false);
          return;
        }
        row.taken_at = taken.toISOString();
      }
      if (status === "pospuesta") row.postponed_until = timeValue;
    }

    const { error: insertError } = await supabase.from("med_doses").insert(row);
    setBusy(false);
    if (insertError) {
      setMsg(
        insertError.code === "23505"
          ? "Otra persona ya registró esta toma un instante antes. Se actualizó la lista."
          : doseError(insertError.message)
      );
    } else {
      setActing(null);
    }
    load();
  };

  const renderSlot = (s: Slot) => {
    const ds = slotDoses(s);
    const resolved = resolvedOf(s);
    const postponed = ds
      .filter((d) => d.status === "pospuesta")
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
    const due = postponed?.postponed_until ? hhmm(postponed.postponed_until) : s.time;
    const dueMs = atTime(due, new Date(s.yesterday ? yesterdayDate : now)).getTime();
    const late = !resolved && nowMs > dueMs + s.med.grace_min * 60000;
    const isDue = !resolved && !late && nowMs >= dueMs;

    let label = "Pendiente";
    if (resolved?.status === "dada") label = `Dada por ${who(resolved.recorded_by)} a las ${clock(resolved.taken_at)}`;
    else if (resolved?.status === "omitida") label = `Omitida por ${who(resolved.recorded_by)}`;
    else if (postponed && !late) label = `Pospuesta hasta las ${due}`;
    else if (late) label = "Sin registrar";
    else if (isDue) label = "Es la hora";

    const allowed = canGive.has(s.med.id) && !resolved;
    const buttons = "min-h-11 rounded-xl px-4 text-sm font-semibold";

    return (
      <li key={`${s.med.id}-${s.date}-${s.time}`} className="py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold [overflow-wrap:anywhere]">
              <span className="tabular-nums">{s.time}</span> · {s.med.name}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {[s.med.dose, s.med.frequency].filter(Boolean).join(" · ")}
            </p>
            <p
              className={`mt-0.5 text-xs font-semibold ${
                resolved?.status === "dada" ? "text-[var(--primary)]" : "text-[var(--muted)]"
              }`}
            >
              {label}
              {resolved?.status === "omitida" && resolved.note ? ` · ${resolved.note}` : ""}
            </p>
          </div>
          {allowed && (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => startSlot(s, "dada")}
                className={`${buttons} bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]`}
              >
                Dada
              </button>
              <button
                type="button"
                onClick={() => startSlot(s, "pospuesta")}
                className={`${buttons} border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--sage)]`}
              >
                Posponer
              </button>
              <button
                type="button"
                onClick={() => startSlot(s, "omitida")}
                className={`${buttons} text-[var(--muted)] hover:bg-[var(--sage)]`}
              >
                Omitir
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  const actingMed = acting ? (acting.type === "prn" ? acting.med : acting.slot.med) : null;
  const actingStatus = acting ? (acting.type === "prn" ? "dada" : acting.status) : null;
  const anyAllowed = meds.some((m) => canGive.has(m.id));

  return (
    <section
      aria-labelledby="meds-today"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
      style={{ borderTop: `6px solid ${color.bar}` }}
    >
      <h2 id="meds-today" className="flex items-center gap-2 text-lg font-semibold">
        <Pill size={18} aria-hidden />
        Medicinas de {child.name}
      </h2>

      {error && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {acting && actingMed && (
        <div className="mt-4 grid gap-4 rounded-xl border-2 p-4" style={{ borderColor: color.bar }}>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold"
              style={{ background: color.bg, color: color.fg }}
            >
              {initials(child.name)}
            </span>
            <p className="text-base font-bold">
              {actingStatus === "omitida"
                ? `¿Omitir la dosis de ${actingMed.name} de ${child.name}?`
                : actingStatus === "pospuesta"
                ? `¿Posponer la dosis de ${actingMed.name} de ${child.name}?`
                : `¿Registrar la dosis de ${actingMed.name} para ${child.name}?`}
            </p>
          </div>

          <p className="text-sm text-[var(--muted)]">
            {[actingMed.dose, actingMed.frequency].filter(Boolean).join(" · ") || "Sin dosis anotada"}
            {acting.type === "slot" && ` · toma de las ${acting.slot.time}${acting.slot.yesterday ? " de ayer" : ""}`}
          </p>

          {actingStatus !== "omitida" && (
            <label className="grid max-w-48 gap-1.5 text-xs font-semibold">
              {actingStatus === "pospuesta" ? "Posponer hasta" : "Hora en que se dio"}
              <input type="time" value={timeValue} onChange={(e) => setTimeValue(e.target.value)} className={input} />
            </label>
          )}

          <label className="grid gap-1.5 text-xs font-semibold">
            {actingStatus === "omitida" ? "Motivo (opcional)" : "Nota (opcional)"}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder={actingStatus === "omitida" ? "Ej. Estaba dormido" : "Ej. Lo tomó con el desayuno"}
              className={input}
            />
          </label>

          {tooSoon && previewMed && (
            <div role="alert" className="grid gap-2 rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
              <p>
                <strong>Pasaron solo {hoursSince!.toFixed(1)} h desde la última dosis.</strong> La familia
                indicó esperar al menos {previewMed.min_interval_hours} h entre dosis.
              </p>
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={early}
                  onChange={(e) => setEarly(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
                />
                <span>Entiendo el aviso y quiero registrarla de todos modos.</span>
              </label>
            </div>
          )}

          {msg && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {msg}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy || (tooSoon && !early) || (actingStatus !== "omitida" && !timeValue)}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Registrando…" : `Sí, registrar para ${child.name}`}
            </button>
            <button
              type="button"
              onClick={() => setActing(null)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!acting && msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}

      {yesterdaySlots.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-[var(--muted)]">De ayer, sin registrar</h3>
          <ul className="divide-y divide-[var(--border)]">{yesterdaySlots.map(renderSlot)}</ul>
        </div>
      )}

      {todaySlots.length > 0 && (
        <ul className="mt-2 divide-y divide-[var(--border)]">{todaySlots.map(renderSlot)}</ul>
      )}

      {prnMeds.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-[var(--muted)]">Solo si es necesario</h3>
          <ul className="divide-y divide-[var(--border)]">
            {prnMeds.map((m) => {
              const last = lastPrn(m.id);
              return (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-semibold [overflow-wrap:anywhere]">{m.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {[m.dose, m.frequency].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[var(--muted)]">
                      {last?.taken_at
                        ? `Última dosis: ${agoText(new Date(last.taken_at), now)} (${clock(last.taken_at)}, por ${who(last.recorded_by)})`
                        : "Sin dosis registradas en los últimos 7 días"}
                    </p>
                    {m.min_interval_hours != null && (
                      <p className="text-xs text-[var(--muted)]">
                        La familia indicó esperar al menos {m.min_interval_hours} h entre dosis.
                      </p>
                    )}
                  </div>
                  {canGive.has(m.id) && (
                    <button
                      type="button"
                      onClick={() => startPrn(m)}
                      className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
                    >
                      Registrar dosis
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {loaded && todaySlots.length === 0 && yesterdaySlots.length === 0 && prnMeds.length === 0 && (
        <p className="mt-3 text-sm text-[var(--muted)]">Hoy no hay tomas programadas.</p>
      )}

      {loaded && !anyAllowed && meds.length > 0 && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Puedes ver las tomas, pero tu rol no las registra en estas medicinas.
        </p>
      )}

      <p className="mt-4 text-xs text-[var(--muted)]">
        La app es un registro y un recordatorio: no sugiere dosis ni sustituye la indicación del médico. Si
        no hay internet no se pueden registrar dosis: anótalo y regístralo después con la hora real. No
        sustituye una alarma propia.
      </p>
    </section>
  );
}