"use client";

import { useState } from "react";
import Link from "next/link";
import QuickLog from "@/components/QuickLog";
import MoodSummary from "@/components/MoodSummary";
import RecentObservations from "@/components/RecentObservations";
import { useChild } from "@/components/ChildGate";
import NextEvent from "@/components/NextEvent";

const goals = [
  { title: "Expresar lo que necesita", note: "Esta semana pidió una pausa en dos momentos nuevos.", progress: 60, tag: "Nuevas iniciativas" },
  { title: "Anticipar los cambios de actividad", note: "Reconoce la secuencia de la mañana y elige el primer paso.", progress: 45, tag: "Seguimos explorando" },
  { title: "Encontrar momentos de calma", note: "Nos muestra cuándo prefiere ir a su rincón de lectura.", progress: 75, tag: "Apoyo que funciona" },
];

export default function Home() {
  const { child } = useChild();
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          El camino de {child.name}, en equipo
        </h1>
        <p className="mt-1 text-[var(--muted)]">Una mirada compartida a su día a día.</p>
      </div>

      <NextEvent />

      <QuickLog onSaved={() => setRefresh((r) => r + 1)} />

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <MoodSummary refreshKey={refresh} />
          <RecentObservations />

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Objetivos que acompañamos</h2>
              <Link href="/objetivos" className="text-xs font-semibold text-[var(--primary)] hover:underline">
                Ver plan →
              </Link>
            </div>
            <ul className="mt-2 divide-y divide-[var(--border)]">
              {goals.map((g) => (
                <li key={g.title} className="py-5">
                  <h3 className="font-semibold">{g.title}</h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">{g.note}</p>
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
                  <span className="mt-3 inline-block rounded-md bg-[var(--sage)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
                    {g.tag}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="grid gap-6">
          <section className="rounded-2xl bg-[var(--blue)] p-6">
            <h2 className="text-lg font-semibold">Nuestro próximo encuentro</h2>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
              26 de octubre · 17:00–17:45
            </p>
            <h3 className="mt-1 font-semibold">Revisión de apoyos</h3>
            <p className="text-sm text-[var(--muted)]">Videollamada · Familia y equipo</p>
            <Link
              href="/calendario"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
            >
              Ver calendario
            </Link>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Para probar juntos</h2>
            <span className="mt-2 inline-block rounded-md bg-[var(--sage)] px-2.5 py-1 text-[11px] font-semibold text-[var(--primary)]">
              Actividad acordada · 5–10 min
            </span>
            <h3 className="mt-3 font-semibold">Elegimos el cuento de hoy</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Presentar dos opciones y esperar su elección.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}