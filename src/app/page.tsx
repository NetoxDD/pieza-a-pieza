"use client";

import { useState } from "react";
import QuickLog from "@/components/QuickLog";
import MoodSummary from "@/components/MoodSummary";
import RecentObservations from "@/components/RecentObservations";
import GoalsPreview from "@/components/GoalsPreview";
import NextEvent from "@/components/NextEvent";
import { useChild } from "@/components/ChildGate";
import HelpsBanner from "@/components/HelpsBanner";

export default function Home() {
  const { child } = useChild();
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">El camino de {child.name}, en equipo</h1>
        <p className="mt-1 text-[var(--muted)]">Una mirada compartida a su día a día.</p>
      </div>

      <section className="rounded-2xl bg-[var(--sage)] p-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
          Lo que nos ayuda a conectar
        </p>
        <h2 className="mt-2 text-2xl font-medium">Mucho por descubrir, a su ritmo.</h2>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Darle tiempo para responder y anticipar lo que viene ayuda a participar con confianza.
        </p>
      </section>

      <QuickLog onSaved={() => setRefresh((r) => r + 1)} />

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <MoodSummary refreshKey={refresh} />
          <RecentObservations />
          <GoalsPreview />
        </div>

        <aside className="grid gap-6">
          <NextEvent />
   <HelpsBanner />
        </aside>
      </div>
    </div>
  );
}