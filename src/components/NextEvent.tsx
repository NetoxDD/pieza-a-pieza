"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat } from "lucide-react";
import { useChild } from "@/components/ChildGate";
import { localDate } from "@/lib/routines";
import { fetchOccurrences, repeatText, type Occ } from "@/lib/events";

export default function NextEvent() {
  const { child } = useChild();
  const [ev, setEv] = useState<Occ | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = new Date();
      const rows = await fetchOccurrences(
        child.id,
        localDate(t),
        localDate(new Date(t.getFullYear(), t.getMonth(), t.getDate() + 400))
      );
      if (cancelled) return;
      if (rows) setEv(rows[0] ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id]);

  let when = "";
  if (ev) {
    const [y, m, d] = ev.occ_date.split("-").map(Number);
    when = new Date(y, m - 1, d).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
    if (ev.event_time) when += ` · ${ev.event_time}`;
  }

  return (
    <section className="rounded-2xl bg-[var(--blue)] p-6">
      <h2 className="text-lg font-semibold">Nuestro próximo encuentro</h2>

      {loading ? (
        <p className="mt-3 text-sm text-[var(--muted)]">Cargando…</p>
      ) : ev ? (
        <>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">{when}</p>
          <h3 className="mt-1 font-semibold [overflow-wrap:anywhere]">{ev.title}</h3>
          {ev.repeat_kind !== "none" && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-[var(--muted)]">
              <Repeat size={14} aria-hidden className="mt-0.5 shrink-0" />
              {repeatText(ev.repeat_kind, ev.repeat_every, ev.repeat_days, ev.repeat_until, ev.series_start)}
            </p>
          )}
          {ev.detail && <p className="text-sm text-[var(--muted)] [overflow-wrap:anywhere]">{ev.detail}</p>}
        </>
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">No hay encuentros próximos. Agenda uno en el calendario.</p>
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