"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

type Obs = { id: string; author_id: string; category: string; body: string; created_at: string };

export default function RecentObservations() {
  const { child } = useChild();
  const [obs, setObs] = useState<Obs[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [o, p] = await Promise.all([
        supabase
          .from("observations")
          .select("id,author_id,category,body,created_at")
          .eq("child_id", child.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("profiles").select("id,full_name"),
      ]);
      if (cancelled) return;
      if (!o.error && !p.error) {
        setObs(o.data as Obs[]);
        setNames(Object.fromEntries(p.data.map((x) => [x.id, x.full_name])));
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [child.id]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lo que estamos observando</h2>
        <Link href="/registro" className="text-xs font-semibold text-[var(--primary)] hover:underline">
          Ver registro →
        </Link>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Cargando…</p>
      ) : obs.length === 0 ? (
        <p className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Aún no hay observaciones. Escribe la primera en la sección Registro.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {obs.map((o) => (
            <li key={o.id} className="py-4">
              <strong className="text-sm">{names[o.author_id] || "Alguien del equipo"}</strong>
              <small className="block text-xs text-[var(--muted)]">
                {new Date(o.created_at).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
              <p className="mt-1.5 line-clamp-3 text-sm [overflow-wrap:anywhere]">{o.body}</p>
              <span className="mt-2 inline-block rounded-md bg-[var(--sage)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)]">
                {o.category}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}