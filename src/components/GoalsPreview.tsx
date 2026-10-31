"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

type G = { id: string; title: string; status: string; progress: number; observing: string | null };

export default function GoalsPreview() {
  const { child } = useChild();
  const [goals, setGoals] = useState<G[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("id,title,status,progress,observing")
        .eq("child_id", child.id)
        .order("created_at")
        .limit(3);
      if (cancelled) return;
      if (!error) setGoals(data as G[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Objetivos que acompañamos</h2>
        <Link href="/objetivos" className="text-xs font-semibold text-[var(--primary)] hover:underline">
          Ver plan →
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Cargando…</p>
      ) : goals.length === 0 ? (
        <p className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Aún no hay objetivos. Crea el primero en la sección Objetivos.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {goals.map((g) => (
            <li key={g.id} className="py-5">
              <h3 className="font-semibold [overflow-wrap:anywhere]">{g.title}</h3>
              {g.observing && (
                <p className="mt-1 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{g.observing}</p>
              )}
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--sage)]"
                role="progressbar"
                aria-valuenow={g.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso: ${g.title}`}
              >
                <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${g.progress}%` }} />
              </div>
              <span className="mt-3 inline-block rounded-md bg-[var(--sage)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)]">
                {g.status} · {g.progress}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}