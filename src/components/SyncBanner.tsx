"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { useChild } from "@/components/ChildGate";
import { useOnline } from "@/lib/online";
import { discard, flushQueue, parseQueue, queueSnapshot, subscribeQueue } from "@/lib/offlineQueue";

// Aviso fijo bajo el encabezado: sin conexión, enviando o con registros rechazados
export default function SyncBanner() {
  const { userId } = useChild();
  const online = useOnline();
  const raw = useSyncExternalStore(subscribeQueue, queueSnapshot, () => "");
  const mine = useMemo(() => parseQueue(raw).filter((q) => q.userId === userId), [raw, userId]);
  const waiting = mine.filter((q) => !q.error);
  const rejected = mine.filter((q) => q.error);

  // Al volver la señal (y cada 20 s mientras haya algo pendiente) se envía la cola
  useEffect(() => {
    if (!online || waiting.length === 0) return;
    flushQueue(userId);
    const id = setInterval(() => flushQueue(userId), 20000);
    return () => clearInterval(id);
  }, [online, waiting.length, userId]);

  if (online && mine.length === 0) return null;

  return (
    <div className="sticky top-[var(--header-h)] z-30 grid gap-2">
      {!online && (
        <p role="status" className="flex items-center gap-3 bg-[var(--sand)] px-4 py-3 text-sm font-semibold text-[var(--sand-text)] md:px-9">
          <CloudOff size={20} aria-hidden className="shrink-0" />
          <span>
            Sin conexión. Puedes seguir anotando el ánimo y las observaciones: se enviarán al volver la señal.
            {waiting.length > 0 && ` Pendientes: ${waiting.length}.`}
          </span>
        </p>
      )}
      {online && waiting.length > 0 && (
        <p role="status" className="flex items-center gap-3 bg-[var(--sage)] px-4 py-3 text-sm font-semibold text-[var(--primary)] md:px-9">
          <RefreshCw size={20} aria-hidden className="shrink-0" />
          Enviando {waiting.length} {waiting.length === 1 ? "registro guardado" : "registros guardados"}…
        </p>
      )}
      {rejected.map((q) => (
        <div key={q.id} role="alert" className="flex flex-wrap items-center gap-3 border-y border-[var(--danger)] bg-[var(--surface)] px-4 py-3 text-sm md:px-9">
          <TriangleAlert size={20} aria-hidden className="shrink-0 text-[var(--danger)]" />
          <span className="min-w-0 flex-1">
            <strong>No se pudo enviar: {q.label}.</strong> {q.error}
          </span>
          <button
            type="button"
            onClick={() => discard(q.id)}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 font-semibold hover:bg-[var(--sage)]"
          >
            Descartar
          </button>
        </div>
      ))}
    </div>
  );
}
