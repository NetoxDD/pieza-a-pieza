"use client";

import type { ReactNode } from "react";
import { CircleAlert, Inbox, WifiOff } from "lucide-react";
import { useOnline } from "@/lib/online";

// Carga: esqueleto tranquilo (sin animación si el modo calma está activo)
export function LoadingBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-busy="true" className="grid gap-3 py-2">
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="h-5 animate-pulse rounded-lg bg-[var(--sage)]"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

// Error al cargar: dice qué pasó en palabras simples y ofrece reintentar
export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const online = useOnline();
  const retry = onRetry ?? (() => window.location.reload());
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-[var(--danger)] bg-[var(--surface)] p-5"
    >
      {online ? (
        <CircleAlert size={28} aria-hidden className="shrink-0 text-[var(--danger)]" />
      ) : (
        <WifiOff size={28} aria-hidden className="shrink-0 text-[var(--danger)]" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {online ? message : "No hay conexión a internet."}
        </p>
        <p className="mt-0.5 text-sm text-[var(--muted)]">
          {online
            ? "Revisa tu conexión e inténtalo de nuevo."
            : "Cuando vuelva la señal, pulsa «Reintentar». Lo que ya viste sigue en pantalla."}
        </p>
      </div>
      <button
        type="button"
        onClick={retry}
        className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
      >
        Reintentar
      </button>
    </div>
  );
}

// Vacío: dice qué es esto y cuál es el primer paso
export function EmptyBlock({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-6 py-8 text-center">
      <Inbox size={30} aria-hidden className="text-[var(--muted)]" />
      <p className="text-lg font-semibold">{title}</p>
      {children && <p className="max-w-md text-sm text-[var(--muted)]">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
