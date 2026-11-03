"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { SOON_DAYS, expiryLabel, expiryOf } from "@/lib/documents";
import { formatDate } from "@/lib/ficha";

type Row = { id: string; title: string; valid_until: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function ExpiringDocs() {
  const { child } = useChild();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const limit = new Date();
      limit.setDate(limit.getDate() + SOON_DAYS);
      // La base de datos solo devuelve los documentos que tu rol puede ver
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,valid_until")
        .eq("child_id", child.id)
        .not("valid_until", "is", null)
        .lte("valid_until", iso(limit))
        .order("valid_until")
        .limit(4);
      if (!cancelled && !error && data) setRows(data as Row[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl bg-[var(--sand)] p-6 text-[var(--sand-text)]">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <AlertTriangle size={18} aria-hidden />
        Documentos por vencer
      </h2>
      <ul className="mt-3 grid gap-2 text-sm">
        {rows.map((r) => (
          <li key={r.id}>
            <strong className="[overflow-wrap:anywhere]">{r.title}</strong>
            <span className="block text-xs">
              {formatDate(r.valid_until)} · {expiryLabel(expiryOf(r.valid_until))}
            </span>
          </li>
        ))}
      </ul>
      <Link href="/documentos/#vencen" className="mt-3 inline-block text-xs font-semibold underline">
        Ver todos →
      </Link>
    </section>
  );
}