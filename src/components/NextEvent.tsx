"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

type Ev = {
  id: string;
  event_date: string;
  event_time: string | null;
  title: string;
  detail: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function NextEvent() {
  const { child } = useChild();
  const [ev, setEv] = useState<Ev | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const t = new Date();
      const today = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;

      const { data, error } = await supabase
        .from("events")
        .select("id,event_date,event_time,title,detail")
        .eq("child_id", child.id)
        .gte("event_date", today)
        .order("event_date")
        .order("event_time", { ascending: true, nullsFirst: false })
        .limit(1);

      if (cancelled) return;
      if (!error) setEv((data?.[0] as Ev) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [child.id]);

  let when = "";
  if (ev) {
    const [y, m, d] = ev.event_date.split("-").map(Number);
    when = new Date(y, m - 1, d).toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (ev.event_time) when += ` · ${ev.event_time.slice(0, 5)}`;
  }

  return (
    <section className="rounded-2xl bg-[var(--blue)] p-6">
      <h2 className="text-lg font-semibold">Nuestro próximo encuentro</h2>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Cargando…</p>
      ) : ev ? (
        <>
          <p className="mt-3 text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
            {when}
          </p>
          <h3 className="mt-1 font-semibold [overflow-wrap:anywhere]">{ev.title}</h3>
          {ev.detail && (
            <p className="text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{ev.detail}</p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No hay encuentros próximos. Agenda uno en el calendario.
        </p>
      )}

      <Link
        href="/calendario"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
      >
        Ver calendario
      </Link>
    </section>
  );
}