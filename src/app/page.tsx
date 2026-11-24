"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Moon, Pencil, Pill, Smile } from "lucide-react";
import QuickLog from "@/components/QuickLog";
import MoodSummary from "@/components/MoodSummary";
import RecentObservations from "@/components/RecentObservations";
import GoalsPreview from "@/components/GoalsPreview";
import NextEvent from "@/components/NextEvent";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import PinnedMaterial from "@/components/PinnedMaterial";
import TodayCard from "@/components/TodayCard";
import NextUp from "@/components/NextUp";

export default function Home() {
  const { child, userId, userName } = useChild();
  const { access } = useChildProfile();
  const { get } = useProfiles();
  const [refresh, setRefresh] = useState(0);

  const full = get(userId)?.name || userName || "";
  const first = full.trim().split(/\s+/)[0];

  const actions = [
    { href: "#animo", label: "Cómo está hoy", icon: Smile, tint: "var(--sage)", show: true },
    { href: "/registro/medicinas", label: "Dar una medicina", icon: Pill, tint: "var(--blue)", show: access.medications },
    { href: "/registro/observaciones", label: "Anotar algo que noté", icon: Pencil, tint: "var(--sand)", show: true },
    { href: "/registro/bienestar", label: "Cómo durmió y comió", icon: Moon, tint: "var(--blue)", show: access.wellbeing },
    { href: "/comunicacion", label: "Escribir al equipo", icon: MessageCircle, tint: "var(--sage)", show: true },
  ].filter((a) => a.show);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">{first ? `Hola, ${first}` : "Hola"}</h1>
        <p className="mt-1 text-lg text-[var(--muted)]">Esto es lo que toca hoy para {child.name}.</p>
      </div>

      <NextUp />

      <section aria-labelledby="actions-title" className="grid gap-3">
        <h2 id="actions-title" className="text-2xl font-bold">
          ¿Qué quieres hacer?
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map(({ href, label, icon: Icon, tint }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-28 items-center gap-4 rounded-3xl p-5 text-xl font-bold transition hover:brightness-95"
              style={{ background: tint }}
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--surface)] text-[var(--primary)]">
                <Icon size={32} aria-hidden />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </section>

      <div id="animo" className="scroll-mt-24">
        <QuickLog onSaved={() => setRefresh((r) => r + 1)} />
      </div>

      <section aria-labelledby="day-title" className="grid gap-4">
        <h2 id="day-title" className="text-2xl font-bold">
          Cómo va el día de {child.name}
        </h2>
        <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6">
            <MoodSummary refreshKey={refresh} />
            <RecentObservations />
            <GoalsPreview />
          </div>
          <aside className="grid gap-6">
            <TodayCard />
            <NextEvent />
            <PinnedMaterial />
          </aside>
        </div>
      </section>
    </div>
  );
}
