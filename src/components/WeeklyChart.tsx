"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

const WEEKS = 6;
const DAY = 24 * 60 * 60 * 1000;

type Row = { semana: string; Observaciones: number; "Registros rápidos": number };

function weekStart(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function WeeklyChart() {
  const { child } = useChild();
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const s0 = weekStart(new Date());
      const first = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() - 7 * (WEEKS - 1));
      const since = first.toISOString();

      const [o, m] = await Promise.all([
        supabase.from("observations").select("created_at").eq("child_id", child.id).gte("created_at", since),
        supabase.from("mood_logs").select("created_at").eq("child_id", child.id).gte("created_at", since),
      ]);
      if (cancelled) return;

      if (o.error || m.error) {
        setError("No se pudo cargar la gráfica.");
        setLoading(false);
        return;
      }

      const rows: Row[] = Array.from({ length: WEEKS }, (_, k) => ({
        semana: new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7 * k).toLocaleDateString(
          "es-MX",
          { day: "numeric", month: "short" }
        ),
        Observaciones: 0,
        "Registros rápidos": 0,
      }));

      const idx = (iso: string) =>
        Math.round((weekStart(new Date(iso)).getTime() - first.getTime()) / (7 * DAY));

      o.data.forEach((r) => {
        const i = idx(r.created_at);
        if (i >= 0 && i < WEEKS) rows[i].Observaciones++;
      });
      m.data.forEach((r) => {
        const i = idx(r.created_at);
        if (i >= 0 && i < WEEKS) rows[i]["Registros rápidos"]++;
      });

      setData(rows);
      setError("");
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [child.id]);

  const empty = data.every((r) => r.Observaciones === 0 && r["Registros rápidos"] === 0);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Actividad del equipo por semana</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Observaciones y registros rápidos de las últimas {WEEKS} semanas. Cada punto es la semana que
        empieza ese día.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Cargando…</p>
      ) : empty ? (
        <p className="mt-4 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Todavía no hay actividad en estas semanas. Cuando el equipo registre cosas, aparecerán aquí.
        </p>
      ) : (
        <div className="mt-4 h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#dde5dd" strokeDasharray="3 3" />
              <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#60736b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#60736b" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #dde5dd", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Observaciones" stroke="#426f5d" strokeWidth={3} dot={{ r: 4 }} />
              <Line
                type="monotone"
                dataKey="Registros rápidos"
                stroke="#c9a55c"
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}