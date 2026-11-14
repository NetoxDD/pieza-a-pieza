"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { areaOf, signedWins, type Win } from "@/lib/wins";

export default function KidWins() {
  const { child } = useChild();
  const [wins, setWins] = useState<Win[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("id,author_id,achieved_on,area,title,note,goal_id,show_to_child,photo_path,thumb_path,created_at")
        .eq("child_id", child.id)
        .eq("show_to_child", true)
        .order("achieved_on", { ascending: false })
        .limit(30);
      if (cancelled) return;
      if (error) {
        setError("No se pudo cargar. Pide ayuda a un adulto.");
        setLoading(false);
        return;
      }
      const list = data as Win[];
      setWins(list);
      const map = await signedWins(list.map((x) => x.thumb_path).filter((x): x is string => !!x));
      if (!cancelled) {
        setUrls(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  return (
    <div className="grid gap-5">
      <h1 className="text-4xl font-bold">Mis logros 🌟</h1>

      {loading && <p className="text-lg text-[var(--muted)]">Cargando…</p>}
      {error && (
        <p role="alert" className="text-lg font-semibold text-[var(--danger)]">
          {error}
        </p>
      )}
      {!loading && !error && wins.length === 0 && (
        <p className="rounded-3xl border-2 border-[var(--border)] p-6 text-xl">
          Pronto aquí aparecerán tus logros. ¡Sigue así! 🌈
        </p>
      )}

      <ul className="grid gap-4">
        {wins.map((w) => (
          <li key={w.id} className="flex items-center gap-5 rounded-3xl border-4 border-[var(--primary)] bg-[var(--surface)] p-5">
            {w.thumb_path && urls[w.thumb_path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urls[w.thumb_path]} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
            ) : (
              <span aria-hidden className="text-6xl">
                {areaOf(w.area).emoji}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-2xl font-bold [overflow-wrap:anywhere]">{w.title}</p>
              <p className="text-base text-[var(--muted)]">
                {new Date(`${w.achieved_on}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}