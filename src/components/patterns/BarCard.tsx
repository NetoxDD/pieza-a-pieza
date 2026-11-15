"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MIN_POINTS, type Count } from "@/lib/patterns";

export default function BarCard({
  title,
  hint,
  data,
  unit = "",
  min = MIN_POINTS,
}: {
  title: string;
  hint?: string;
  data: Count[];
  unit?: string;
  min?: number;
}) {
  const id = useId();
  const total = data.reduce((a, d) => a + d.n, 0);
  const rows = data.map((d) => ({ name: d.label, valor: d.n }));

  return (
    <section aria-labelledby={id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}

      {total < min ? (
        <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          Todavía hay pocos registros ({total}) para ver un patrón. Se necesitan al menos {min}.
        </p>
      ) : (
        <>
          <div className="mt-4 h-52" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={unit === " h"} />
                <Tooltip formatter={(v) => [`${v}${unit}`, ""]} />
                <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details className="mt-2">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold text-[var(--primary)]">
              Ver como lista
            </summary>
            <ul className="mt-2 divide-y divide-[var(--border)] text-sm">
              {data.map((d) => (
                <li key={d.label} className="flex justify-between gap-3 py-2">
                  <span>{d.long ?? d.label}</span>
                  <span className="font-semibold tabular-nums">
                    {d.n}
                    {unit}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}