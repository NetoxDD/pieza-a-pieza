"use client";

import { supabase } from "@/lib/supabase";

// Cola de registros SIN conexión.
// Solo se encolan registros que se pueden enviar después sin riesgo (ánimo y observaciones de texto).
// Las dosis de medicina NO se encolan: si otra persona la da mientras tanto, se duplicaría.
export type QTable = "mood_logs" | "observations";

export type QItem = {
  id: string;
  userId: string;
  table: QTable;
  row: Record<string, unknown>;
  label: string;
  at: string;
  error?: string; // si el servidor lo rechazó, queda aquí para que la persona lo vea
};

export const QUEUE_KEY = "pap:queue";
const EVENT = "pap:queue";

function parse(raw: string | null): QItem[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const parseQueue = (raw: string) => parse(raw || null);
export const readQueue = (): QItem[] => parse(typeof localStorage === "undefined" ? null : localStorage.getItem(QUEUE_KEY));

function write(items: QItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeQueue(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export const queueSnapshot = () => localStorage.getItem(QUEUE_KEY) ?? "";

export function isNetworkError(err: { message?: string } | null | undefined) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed/i.test(err?.message ?? "");
}

export function enqueue(item: Omit<QItem, "id" | "at" | "error">) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  write([...readQueue(), { ...item, id, at: new Date().toISOString() }]);
}

export function discard(id: string) {
  write(readQueue().filter((q) => q.id !== id));
}

let flushing = false;

// Envía lo pendiente de esta persona, en orden. Se detiene si se vuelve a caer la conexión.
export async function flushQueue(userId: string): Promise<number> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) return 0;
  flushing = true;
  let sent = 0;
  try {
    for (const item of readQueue().filter((q) => q.userId === userId && !q.error)) {
      const { error } = await supabase.from(item.table).insert(item.row);
      if (!error) {
        write(readQueue().filter((q) => q.id !== item.id));
        sent++;
        continue;
      }
      if (isNetworkError(error)) break;
      write(readQueue().map((q) => (q.id === item.id ? { ...q, error: error.message || "El servidor lo rechazó." } : q)));
    }
  } finally {
    flushing = false;
  }
  return sent;
}
