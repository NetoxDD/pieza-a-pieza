"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

const moods = [
  { emoji: "😊", label: "Contento" },
  { emoji: "😌", label: "Tranquilo" },
  { emoji: "😐", label: "Neutro" },
  { emoji: "😣", label: "Incómodo" },
  { emoji: "😢", label: "Triste" },
  { emoji: "😠", label: "Frustrado" },
];

type Log = {
  id: string;
  author_id: string;
  mood: string;
  place: string | null;
  created_at: string;
};

export default function MoodSummary({ refreshKey }: { refreshKey: number }) {
  const { child } = useChild();
  const [logs, setLogs] = useState<Log[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [l, p] = await Promise.all([
        supabase
          .from("mood_logs")
          .select("id,author_id,mood,place,created_at")
          .eq("child_id", child.id)
          .gte("created_at", since)
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("id,full_name"),
      ]);
      if (cancelled) return;

      if (l.error || p.error) {
        setError("No se pudo cargar el resumen.");
      } else {
        setError("");
        setLogs(l.data as Log[]);
        setNames(Object.fromEntries(p.data.map((x) => [x.id, x.full_name])));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [child.id, refreshKey]);

  const counts = moods.map((m) => ({
    ...m,
    n: logs.filter((x) => x.mood === m.label).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.n));

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Cómo ha ido la semana</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Registros de los últimos 7 días: {logs.length}.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Cargando…</p>
      ) : logs.length === 0 ? (
        <p className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Todavía no hay registros esta semana. Usa el registro rápido de arriba.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-2.5">
            {counts.map((c) => (
              <li key={c.label} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span>
                  <span aria-hidden>{c.emoji} </span>
                  {c.label}
                </span>
                <span className="h-2.5 overflow-hidden rounded-full bg-[var(--sage)]" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-[var(--primary)]"
                    style={{ width: `${(c.n / max) * 100}%` }}
                  />
                </span>
                <span className="text-right font-semibold">{c.n}</span>
              </li>
            ))}
          </ul>

          <h3 className="mt-6 text-sm font-semibold">Últimos registros</h3>
          <ul className="mt-2 divide-y divide-[var(--border)]">
            {logs.slice(0, 5).map((x) => (
              <li key={x.id} className="py-3 text-sm">
                <strong>{x.mood}</strong>
                {x.place && <span> · {x.place}</span>}
                <small className="block text-xs text-[var(--muted)]">
                  {names[x.author_id] || "Alguien del equipo"} ·{" "}
                  {new Date(x.created_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}