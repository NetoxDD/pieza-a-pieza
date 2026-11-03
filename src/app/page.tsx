"use client";

import { useState } from "react";
import QuickLog from "@/components/QuickLog";
import MoodSummary from "@/components/MoodSummary";
import RecentObservations from "@/components/RecentObservations";
import GoalsPreview from "@/components/GoalsPreview";
import NextEvent from "@/components/NextEvent";
import { useChild } from "@/components/ChildGate";
import HelpsBanner from "@/components/HelpsBanner";
import PinnedMaterial from "@/components/PinnedMaterial";
import ExpiringDocs from "@/components/ExpiringDocs";

export default function Home() {
  const { child } = useChild();
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">El camino de {child.name}, en equipo</h1>
        <p className="mt-1 text-[var(--muted)]">Una mirada compartida a su día a día.</p>
      </div>

   <PinnedMaterial />

      <QuickLog onSaved={() => setRefresh((r) => r + 1)} />

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <MoodSummary refreshKey={refresh} />
          <RecentObservations />
          <GoalsPreview />
        </div>

        <aside className="grid gap-6">
          <ExpiringDocs />
          <NextEvent />
   <HelpsBanner />
        </aside>
      </div>
    </div>
  );
}