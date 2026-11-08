"use client";

import Link from "next/link";
import { BellRing, ListChecks, Pill } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useToday } from "@/components/TodayProvider";

export default function TodayCard() {
  const { settings } = useSettings();
  const t = useToday();

  if (!settings.alerts || !t.loaded) return null;
  if (!t.hasMeds && !t.hasRoutines && t.alerts.length === 0) return null;

  const rows: { key: string; icon: typeof Pill; text: string; href: string; tone?: boolean }[] = [];

  if (t.hasMeds) {
    if (t.lateDoses > 0) {
      rows.push({
        key: "late",
        icon: Pill,
        text: `Hay ${t.lateDoses} ${t.lateDoses === 1 ? "toma sin registrar" : "tomas sin registrar"}`,
        href: "/registro/",
        tone: true,
      });
    } else if (t.nextDose) {
      rows.push({
        key: "next",
        icon: Pill,
        text: `Próxima toma: ${t.nextDose.med} a las ${t.nextDose.time}`,
        href: "/registro/",
      });
    } else {
      rows.push({ key: "none", icon: Pill, text: "Sin tomas pendientes por ahora", href: "/registro/" });
    }
  }

  if (t.hasRoutines) {
    rows.push({
      key: "steps",
      icon: ListChecks,
      text:
        t.pendingSteps > 0
          ? `Quedan ${t.pendingSteps} ${t.pendingSteps === 1 ? "paso" : "pasos"} de las rutinas de hoy`
          : "Las rutinas de hoy están al día",
      href: "/registro/",
    });
  }

  return (
    <section
      aria-labelledby="today-title"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h2 id="today-title" className="flex items-center gap-2 text-lg font-semibold">
        <BellRing size={18} aria-hidden />
        Hoy
      </h2>

      <ul className="mt-3 divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <li key={r.key}>
            <Link
              href={r.href}
              className="flex min-h-11 items-center gap-3 py-2 text-sm hover:underline"
            >
              <r.icon size={16} aria-hidden className="shrink-0 text-[var(--primary)]" />
              <span className={r.tone ? "font-semibold text-[var(--danger)]" : ""}>{r.text}</span>
            </Link>
          </li>
        ))}
        {t.alerts.map((a) => (
          <li key={a.id}>
            <Link
              href={a.href}
              className="flex min-h-11 items-center gap-3 py-2 text-sm hover:underline"
            >
              <span aria-hidden className="shrink-0 text-[var(--muted)]">
                •
              </span>
              <span className={a.tone === "atencion" ? "font-semibold text-[var(--danger)]" : ""}>
                {a.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-[var(--muted)]">
        Se actualiza con la app abierta y no sustituye una alarma propia. Puedes ocultar estos recordatorios en
        Ajustes.
      </p>
    </section>
  );
}