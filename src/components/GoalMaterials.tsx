"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { kindLabel } from "@/lib/material";

type Row = { id: string; title: string; kind: string };

export default function GoalMaterials({ goalId }: { goalId: string }) {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // La base de datos solo devuelve el material que tu rol puede ver
      const { data } = await supabase
        .from("materials")
        .select("id,title,kind")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: false });
      if (!cancelled && data) setItems(data as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (items.length === 0) return null;

  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold">Material relacionado</h3>
      <ul className="mt-2 grid gap-2">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              href={`/material/#m-${m.id}`}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 text-sm hover:bg-[var(--sage)]"
            >
              <span className="[overflow-wrap:anywhere]">{m.title}</span>
              <span className="shrink-0 text-xs text-[var(--muted)]">{kindLabel[m.kind]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}