"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { categoryLabel, kindLabel } from "@/lib/material";

type Pinned = {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  duration_min: number | null;
  category: string;
};

export default function PinnedMaterial() {
  const { child, role } = useChild();
  const [item, setItem] = useState<Pinned | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id,kind,title,description,duration_min,category")
        .eq("child_id", child.id)
        .eq("pinned", true)
        .maybeSingle();
      if (cancelled) return;
      if (!error) setItem(data as Pinned | null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Para probar juntos</h2>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Cargando…</p>
      ) : item ? (
        <>
          <span className="mt-2 inline-block rounded-md bg-[var(--sage)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--primary)]">
            {kindLabel[item.kind]}
            {item.duration_min ? ` · ${item.duration_min} min` : ""} ·{" "}
            {categoryLabel[item.category] ?? item.category}
          </span>
          <h3 className="mt-3 font-semibold [overflow-wrap:anywhere]">{item.title}</h3>
          {item.description && (
            <p className="mt-1 line-clamp-3 text-sm text-[var(--muted)] [overflow-wrap:anywhere]">
              {item.description}
            </p>
          )}
          <Link
            href={`/material/#m-${item.id}`}
            className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            Ver la publicación →
          </Link>
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          {role === "familia" ? (
            <>
              Aquí aparece la actividad que fijes.{" "}
              <Link href="/material/" className="font-semibold text-[var(--primary)] hover:underline">
                Elegir una publicación →
              </Link>
            </>
          ) : (
            "Aquí aparecerá la actividad que la familia fije desde Material."
          )}
        </p>
      )}
    </section>
  );
}