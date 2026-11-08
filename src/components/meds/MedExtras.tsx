"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import { expiryLabel, expiryOf } from "@/lib/documents";
import { formatDate } from "@/lib/ficha";
import { estimateDays, fmtQty, lowStock, type Med } from "@/lib/meds";

type DocOpt = { id: string; title: string; valid_until: string | null };
type LedgerRow = {
  id: string;
  delta: number;
  reason: string;
  note: string | null;
  created_by: string;
  created_at: string;
};
type Mode = null | "activate" | "refill" | "adjust" | "config";

const reasonLabel: Record<string, string> = {
  resurtido: "Resurtido",
  ajuste: "Ajuste",
  dosis: "Dosis dada",
  anulacion: "Dosis anulada (se devuelve)",
};

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";

export default function MedExtras({
  med,
  isFamily,
  rxValidUntil,
  onHand,
  docs,
  onChanged,
}: {
  med: Med;
  isFamily: boolean;
  rxValidUntil: string | null;
  onHand: number | null;
  docs: DocOpt[];
  onChanged: () => void;
}) {
  const { child } = useChild();
  const { get } = useProfiles();
  const [mode, setMode] = useState<Mode>(null);
  const [f, setF] = useState({ perDose: "1", perBox: "", alertDays: "7", initial: "", qty: "", actual: "", note: "" });
  const [log, setLog] = useState<LedgerRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const exp = expiryOf(rxValidUntil);
  const hasStock = med.stock_enabled && onHand !== null;
  const est = hasStock ? lowStock(med, onHand!) : { low: false, days: null };

  const open = (m: Mode) => {
    setF({
      perDose: String(med.units_per_dose),
      perBox: med.units_per_box != null ? String(med.units_per_box) : "",
      alertDays: String(med.refill_alert_days),
      initial: "",
      qty: med.units_per_box != null ? String(med.units_per_box) : "",
      actual: onHand != null ? fmtQty(Math.max(0, onHand)) : "",
      note: "",
    });
    setMsg("");
    setMode(m);
  };

  const addLedger = async (delta: number, reason: "resurtido" | "ajuste", note: string | null) => {
    const { error } = await supabase
      .from("med_stock_ledger")
      .insert({ medication_id: med.id, child_id: child.id, delta, reason, note });
    return !error;
  };

  const loadLog = async () => {
    const { data } = await supabase
      .from("med_stock_ledger")
      .select("id,delta,reason,note,created_by,created_at")
      .eq("medication_id", med.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setLog((data ?? []) as LedgerRow[]);
  };

  const linkDoc = async (id: string) => {
    setMsg("");
    const { data, error } = await supabase
      .from("child_medications")
      .update({ document_id: id || null })
      .eq("id", med.id)
      .select("id");
    if (error || !data?.length) setMsg("No se pudo vincular la receta.");
    onChanged();
  };

  const finish = (ok: boolean, text: string) => {
    setBusy(false);
    if (!ok) {
      setMsg(text);
      return;
    }
    setMode(null);
    setLog(null);
    onChanged();
  };

  const submitActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const initial = Number(f.initial || 0);
    if (!(initial >= 0)) return finish(false, "Escribe una cantidad válida.");

    // Si ya hubo inventario antes, el libro conserva su historia: se ajusta la diferencia
    const prev = await supabase.from("med_stock_ledger").select("delta").eq("medication_id", med.id);
    const current = (prev.data ?? []).reduce((s, r) => s + Number(r.delta), 0);

    const upd = await supabase
      .from("child_medications")
      .update({
        stock_enabled: true,
        units_per_dose: Number(f.perDose) || 1,
        units_per_box: f.perBox ? Number(f.perBox) : null,
        refill_alert_days: Number(f.alertDays) || 7,
      })
      .eq("id", med.id)
      .select("id");
    if (upd.error || !upd.data?.length) return finish(false, "No se pudo activar el inventario.");

    const diff = initial - current;
    if (diff !== 0 && !(await addLedger(diff, "ajuste", "Cantidad inicial"))) {
      return finish(false, "Se activó, pero no se pudo guardar la cantidad inicial.");
    }
    finish(true, "");
  };

  const submitRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(f.qty);
    if (!(qty > 0)) return setMsg("Escribe cuántas unidades añades.");
    setBusy(true);
    const ok = await addLedger(qty, "resurtido", f.note.trim() || null);
    finish(ok, "No se pudo registrar el resurtido.");
  };

  const submitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = Number(f.actual);
    if (!(actual >= 0) || f.actual === "") return setMsg("Escribe cuántas unidades hay ahora.");
    const diff = actual - (onHand ?? 0);
    if (diff === 0) return setMsg("Ya coincide con lo registrado.");
    setBusy(true);
    const ok = await addLedger(diff, "ajuste", f.note.trim() || "Conteo manual");
    finish(ok, "No se pudo guardar el ajuste.");
  };

  const submitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase
      .from("child_medications")
      .update({
        units_per_dose: Number(f.perDose) || 1,
        units_per_box: f.perBox ? Number(f.perBox) : null,
        refill_alert_days: Number(f.alertDays) || 7,
      })
      .eq("id", med.id)
      .select("id");
    finish(!error && !!data?.length, "No se pudo guardar.");
  };

  const disable = async () => {
    if (!window.confirm("¿Desactivar el inventario? El historial de movimientos se conserva.")) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("child_medications")
      .update({ stock_enabled: false })
      .eq("id", med.id)
      .select("id");
    finish(!error && !!data?.length, "No se pudo desactivar.");
  };

  return (
    <div className="mt-5 grid gap-5">
      {/* ---------- Receta ---------- */}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Receta</legend>
        {isFamily && (
          <label className="grid gap-1.5 text-xs font-semibold">
            Documento de la receta
            <select value={med.document_id ?? ""} onChange={(e) => linkDoc(e.target.value)} className={input}>
              <option value="">Sin receta vinculada</option>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                  {d.valid_until ? ` · vigencia ${formatDate(d.valid_until)}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <p
          className={`text-sm ${
            exp.state === "soon" || exp.state === "expired" ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"
          }`}
        >
          {rxValidUntil
            ? `${exp.state === "ok" ? "Vigente hasta el" : "Vigencia:"} ${formatDate(rxValidUntil)}${
                exp.state === "soon" || exp.state === "expired" ? ` · ${expiryLabel(exp)}` : ""
              }`
            : med.document_id
            ? "La receta vinculada no tiene vigencia anotada."
            : "Sin receta vinculada."}
        </p>
        {isFamily && docs.length === 0 && (
          <p className="text-xs text-[var(--muted)]">
            Sube la receta en Documentos, carpeta Recetas, y anota su vigencia para poder vincularla.
          </p>
        )}
      </fieldset>

      {/* ---------- Inventario ---------- */}
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Inventario</legend>

        {hasStock ? (
          <>
            <p className="text-base font-semibold">
              {onHand! < 0
                ? `Por revisar (el libro marca ${fmtQty(onHand!)})`
                : `Quedan ${fmtQty(onHand!)} ${onHand === 1 ? "unidad" : "unidades"}`}
            </p>
            {est.days !== null && (
              <p
                className={`text-sm ${est.low ? "font-semibold text-[var(--danger)]" : "text-[var(--muted)]"}`}
              >
                ≈ {Math.round(est.days)} {Math.round(est.days) === 1 ? "día" : "días"} de medicina
                {est.low ? " · conviene resurtir" : ""}
              </p>
            )}
            {med.as_needed && (
              <p className="text-xs text-[var(--muted)]">
                Esta medicina es «solo si es necesario»: muestra la cantidad, pero no puede avisar de cuándo se acaba.
              </p>
            )}
            <p className="text-xs text-[var(--muted)]">
              Es una estimación según los horarios y las unidades por dosis. Puede no coincidir con lo que
              realmente queda.
            </p>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">
            {isFamily
              ? "No se lleva el inventario de esta medicina."
              : "La familia no lleva el inventario de esta medicina."}
          </p>
        )}

        {isFamily && mode === null && (
          <div className="flex flex-wrap gap-2">
            {!hasStock ? (
              <button type="button" onClick={() => open("activate")} className={ghost}>
                Activar inventario
              </button>
            ) : (
              <>
                <button type="button" onClick={() => open("refill")} className={ghost}>
                  Resurtí
                </button>
                <button type="button" onClick={() => open("adjust")} className={ghost}>
                  Contar y ajustar
                </button>
                <button type="button" onClick={() => open("config")} className={ghost}>
                  Configurar
                </button>
                <button type="button" onClick={loadLog} className={ghost}>
                  Ver movimientos
                </button>
              </>
            )}
          </div>
        )}

        {isFamily && (mode === "activate" || mode === "config") && (
          <form
            onSubmit={mode === "activate" ? submitActivate : submitConfig}
            className="grid gap-4 rounded-xl bg-[var(--background)] p-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="grid gap-1.5 text-xs font-semibold">
                Unidades por dosis
                <input
                  type="number"
                  min={0.25}
                  max={100}
                  step={0.25}
                  value={f.perDose}
                  onChange={(e) => setF({ ...f, perDose: e.target.value })}
                  className={input}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Unidades por caja (opcional)
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={f.perBox}
                  onChange={(e) => setF({ ...f, perBox: e.target.value })}
                  className={input}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-semibold">
                Avisar cuando queden (días)
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={f.alertDays}
                  onChange={(e) => setF({ ...f, alertDays: e.target.value })}
                  className={input}
                />
              </label>
            </div>
            {mode === "activate" && (
              <label className="grid max-w-56 gap-1.5 text-xs font-semibold">
                Unidades que hay ahora
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={f.initial}
                  onChange={(e) => setF({ ...f, initial: e.target.value })}
                  required
                  className={input}
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={primary}>
                {busy ? "Guardando…" : mode === "activate" ? "Activar" : "Guardar"}
              </button>
              <button type="button" onClick={() => setMode(null)} className={ghost}>
                Cancelar
              </button>
              {mode === "config" && (
                <button
                  type="button"
                  onClick={disable}
                  disabled={busy}
                  className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                >
                  Desactivar inventario
                </button>
              )}
            </div>
          </form>
        )}

        {isFamily && mode === "refill" && (
          <form onSubmit={submitRefill} className="grid gap-4 rounded-xl bg-[var(--background)] p-4">
            <label className="grid max-w-56 gap-1.5 text-xs font-semibold">
              Unidades que añades
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={f.qty}
                onChange={(e) => setF({ ...f, qty: e.target.value })}
                required
                className={input}
              />
              {med.units_per_box != null && (
                <small className="text-xs font-normal text-[var(--muted)]">
                  Una caja trae {fmtQty(med.units_per_box)} unidades.
                </small>
              )}
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Nota (opcional)
              <input
                value={f.note}
                onChange={(e) => setF({ ...f, note: e.target.value })}
                maxLength={200}
                className={input}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={primary}>
                {busy ? "Guardando…" : "Registrar resurtido"}
              </button>
              <button type="button" onClick={() => setMode(null)} className={ghost}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {isFamily && mode === "adjust" && (
          <form onSubmit={submitAdjust} className="grid gap-4 rounded-xl bg-[var(--background)] p-4">
            <label className="grid max-w-56 gap-1.5 text-xs font-semibold">
              Unidades que hay ahora (cuéntalas)
              <input
                type="number"
                min={0}
                step={0.5}
                value={f.actual}
                onChange={(e) => setF({ ...f, actual: e.target.value })}
                required
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Nota (opcional)
              <input
                value={f.note}
                onChange={(e) => setF({ ...f, note: e.target.value })}
                maxLength={200}
                placeholder="Ej. Se cayó una pastilla"
                className={input}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={primary}>
                {busy ? "Guardando…" : "Guardar ajuste"}
              </button>
              <button type="button" onClick={() => setMode(null)} className={ghost}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {log && (
          <div className="rounded-xl bg-[var(--background)] p-4">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">Últimos movimientos</h4>
              <button
                type="button"
                onClick={() => setLog(null)}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
              >
                Cerrar
              </button>
            </div>
            {log.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--muted)]">Todavía no hay movimientos.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border)] text-sm">
                {log.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span>
                      <strong>{reasonLabel[r.reason]}</strong>
                      {r.note ? ` · ${r.note}` : ""}
                      <small className="block text-xs text-[var(--muted)]">
                        {get(r.created_by)?.name ?? "Sistema"} ·{" "}
                        {new Date(r.created_at).toLocaleString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </span>
                    <span className="font-semibold tabular-nums">
                      {r.delta > 0 ? "+" : ""}
                      {fmtQty(Number(r.delta))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-[var(--muted)]">El libro no se edita ni se borra.</p>
          </div>
        )}
      </fieldset>

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </div>
  );
}