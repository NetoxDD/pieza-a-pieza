"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { durationText, epError, inWindow, intensityLabel, placeLabel, type Episode } from "@/lib/episodes";

export default function EpisodeCard({
  ep,
  nameOf,
  userId,
  isFamily,
  onEdit,
  onChanged,
}: {
  ep: Episode;
  nameOf: (id: string) => string;
  userId: string;
  isFamily: boolean;
  onEdit: () => void;
  onChanged: () => void;
}) {
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const voided = !!ep.voided_at;
  const mineFresh = ep.author_id === userId && inWindow(ep);
  const canEdit = !voided && mineFresh;
  const canVoid = !voided && (isFamily || mineFresh);

  const submitVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("void_episode", { eid: ep.id, reason });
    setBusy(false);
    if (error) {
      setError(epError(error, "No se pudo anular."));
      return;
    }
    setVoiding(false);
    onChanged();
  };

  const row = (label: string, text: string | null) =>
    text ? (
      <p className="text-sm">
        <span className="font-semibold">{label}: </span>
        <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{text}</span>
      </p>
    ) : null;

  return (
    <li className={`py-5 ${voided ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="text-sm">
            {new Date(ep.occurred_at).toLocaleString("es-MX", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </strong>
          <small className="block text-xs text-[var(--muted)]">
            {placeLabel(ep.place)} · Intensidad {intensityLabel(ep.intensity).toLowerCase()}
            {ep.duration_minn !== null && ` · ${durationText(ep.duration_minn)}`}
          </small>
        </div>
        {voided && (
          <span className="rounded-md bg-[var(--sand)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--sand-text)]">
            Anulado
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-1.5">
        {row("Antes", ep.antecedent)}
        {row("Qué pasó", ep.behavior)}
        {row("Después", ep.consequence)}
      </div>

      {ep.helped.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold">Qué ayudó:</span>
          {ep.helped.map((h) => (
            <span
              key={h}
              className="rounded-md bg-[var(--sage)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)] [overflow-wrap:anywhere]"
            >
              {h}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-[var(--muted)]">
        Registró {nameOf(ep.author_id)}
        {voided && ` · Anulado por ${nameOf(ep.voided_by ?? "")}: ${ep.void_reason}`}
      </p>

      {(canEdit || canVoid) && !voiding && (
        <div className="mt-1 flex flex-wrap gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
            >
              Editar
            </button>
          )}
          {canVoid && (
            <button
              type="button"
              onClick={() => setVoiding(true)}
              className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
            >
              Anular
            </button>
          )}
        </div>
      )}

      {voiding && (
        <form onSubmit={submitVoid} className="mt-3 grid gap-3 rounded-xl bg-[var(--background)] p-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Motivo de la anulación
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              required
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
            />
          </label>
          <p className="text-xs text-[var(--muted)]">
            El episodio no se borra: queda marcado como anulado, con este motivo.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
            >
              {busy ? "Anulando…" : "Anular episodio"}
            </button>
            <button
              type="button"
              onClick={() => setVoiding(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </li>
  );
}