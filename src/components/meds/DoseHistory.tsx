"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import { hhmm } from "@/lib/routines";
import { DOSE_COLS, doseError, statusLabel, type Dose, type Med } from "@/lib/meds";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const when = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function DoseHistory({ meds, isFamily }: { meds: Med[]; isFamily: boolean }) {
  const { child, userId } = useChild();
  const { get } = useProfiles();
  const [doses, setDoses] = useState<Dose[]>([]);
  const [filter, setFilter] = useState("todas");
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data, error } = await supabase
      .from("med_doses")
      .select(DOSE_COLS)
      .eq("child_id", child.id)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(200);
    if (error) setError("No se pudo cargar el historial.");
    else {
      setError("");
      setDoses(data as Dose[]);
    }
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`dosehist:${child.id}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "med_doses" }, () => load());
    channel.subscribe();
    // Cada medio minuto se revisa si ya pasaron los 10 minutos para anular
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  const medName = (id: string) => meds.find((m) => m.id === id)?.name ?? "Medicamento";
  const canVoid = (d: Dose) =>
    !d.voided_at &&
    (isFamily || (d.recorded_by === userId && Date.now() - new Date(d.recorded_at).getTime() < 10 * 60000));

  const confirmVoid = async (d: Dose) => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("void_dose", { did: d.id, reason });
    setBusy(false);
    if (error) {
      setMsg(doseError(error.message));
      return;
    }
    setVoidingId(null);
    setReason("");
    load();
  };

  const shown = doses.filter((d) => filter === "todas" || d.medication_id === filter);
  void tick;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Historial de los últimos 30 días</h2>
        <label className="flex items-center gap-2 text-xs font-semibold">
          Medicina
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}>
            <option value="todas">Todas</option>
            {meds.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        Los registros no se borran ni se editan. Si hubo un error, se anula con un motivo, y la anulación
        también queda registrada.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Todavía no hay registros.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {shown.map((d) => {
            const voided = !!d.voided_at;
            return (
              <li key={d.id} className={`py-4 ${voided ? "opacity-75" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`font-semibold [overflow-wrap:anywhere] ${voided ? "line-through" : ""}`}>
                      {statusLabel[d.status]} · {medName(d.medication_id)}
                      {d.kind === "programada" && d.scheduled_time
                        ? ` · toma de las ${hhmm(d.scheduled_time)}${d.scheduled_date ? ` del ${d.scheduled_date}` : ""}`
                        : d.kind === "necesaria"
                        ? " · solo si es necesario"
                        : ""}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {d.status === "dada" && d.taken_at ? `Se dio: ${when(d.taken_at)} · ` : ""}
                      {d.status === "pospuesta" && d.postponed_until
                        ? `Pospuesta hasta las ${hhmm(d.postponed_until)} · `
                        : ""}
                      Registrada por {get(d.recorded_by)?.name ?? "alguien del equipo"} · {when(d.recorded_at)}
                    </p>
                    {d.note && <p className="mt-1 text-sm [overflow-wrap:anywhere]">{d.note}</p>}
                    {voided && (
                      <p className="mt-1 text-sm font-semibold text-[var(--sand-text)]">
                        Anulada: {d.void_reason}
                      </p>
                    )}
                  </div>
                  {canVoid(d) && voidingId !== d.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setVoidingId(d.id);
                        setReason("");
                        setMsg("");
                      }}
                      className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                    >
                      Anular
                    </button>
                  )}
                </div>

                {voidingId === d.id && (
                  <div className="mt-2 grid gap-2 rounded-xl bg-[var(--background)] p-3">
                    <label className="grid gap-1.5 text-xs font-semibold">
                      Motivo de la anulación
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={200}
                        placeholder="Ej. La marqué en la medicina equivocada"
                        className={input}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => confirmVoid(d)}
                        disabled={busy || reason.trim().length < 3}
                        className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
                      >
                        {busy ? "Anulando…" : "Confirmar anulación"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoidingId(null)}
                        className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}

      {!isFamily && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Puedes anular un registro tuyo durante los 10 minutos siguientes. Después, solo la familia.
        </p>
      )}
    </section>
  );
}