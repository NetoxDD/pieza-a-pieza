"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useToday } from "@/components/TodayProvider";

function clock12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "p. m." : "a. m."}`;
}

// "Lo siguiente": lo único que importa ahora, con un solo botón.
export default function NextUp() {
  const t = useToday();
  if (!t.loaded) return null;

  let title: string;
  let sub: string;
  let cta: { href: string; label: string } | null = null;
  let tone = "";

  if (t.lateDoses > 0) {
    title = t.lateDoses === 1 ? "Hay una toma sin registrar" : `Hay ${t.lateDoses} tomas sin registrar`;
    sub = "Anota si ya se la dieron para que todo el equipo lo sepa.";
    cta = { href: "/registro/", label: "Registrar ahora" };
    tone = "text-[var(--danger)]";
  } else if (t.nextDose) {
    title = `${t.nextDose.med}`;
    sub = `Le toca a las ${clock12(t.nextDose.time)}.`;
    cta = { href: "/registro/medicinas", label: "Registrar la toma" };
  } else if (t.pendingSteps > 0) {
    title = "Rutinas de hoy";
    sub = `Quedan ${t.pendingSteps} ${t.pendingSteps === 1 ? "paso" : "pasos"} por marcar.`;
    cta = { href: "/registro/", label: "Ver rutinas" };
  } else {
    title = "Todo al día";
    sub = "No hay nada pendiente por ahora.";
  }

  return (
    <section
      aria-labelledby="next-title"
      className="grid gap-4 rounded-3xl bg-[var(--sand)] p-6 text-[var(--sand-text)] md:p-7"
    >
      <p className="text-xs font-extrabold uppercase tracking-widest">Lo siguiente</p>
      <div className="flex items-start gap-3">
        {!cta && <CircleCheck size={32} aria-hidden className="shrink-0 text-[var(--primary)]" />}
        <div>
          <h2 id="next-title" className={`text-2xl font-bold leading-tight md:text-3xl ${tone}`}>
            {title}
          </h2>
          <p className="mt-1 text-lg">{sub}</p>
        </div>
      </div>
      {cta && (
        <div>
          <Link
            href={cta.href}
            className="inline-flex min-h-14 items-center rounded-full bg-[var(--primary)] px-8 text-lg font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            {cta.label}
          </Link>
        </div>
      )}
    </section>
  );
}
