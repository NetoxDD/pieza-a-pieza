"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useChildProfile } from "@/components/ChildProfileProvider";

type Tab = { href: string; label: string; exact?: boolean };

const PLAN: Tab[] = [
  { href: "/objetivos", label: "Objetivos" },
  { href: "/calendario", label: "Calendario" },
  { href: "/material", label: "Material" },
  { href: "/logros", label: "Logros" },
];

const DAY: Tab[] = [
  { href: "/registro", label: "Hoy", exact: true },
  { href: "/registro/rutinas", label: "Rutinas" },
  { href: "/registro/medicinas", label: "Medicinas" },
  { href: "/registro/observaciones", label: "Observaciones" },
     { href: "/registro/bienestar", label: "Sueño y comidas" },
  { href: "/registro/episodios", label: "Episodios" },
  { href: "/registro/cuaderno", label: "Cuaderno" },
];

const MORE = ["/documentos", "/equipo", "/ajustes", "/perfil", "/ficha","/informe","/datos","/privacidad","/plan-calma"];

function Tabs({ label, tabs, pathname }: { label: string; tabs: Tab[]; pathname: string }) {
  const clean = pathname.replace(/\/$/, "") || "/";
  return (
    <nav aria-label={label} className="mb-6 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const active = t.exact ? clean === t.href : clean.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm transition ${
              active
                ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                : "border-[var(--border)] text-[var(--muted)] hover:bg-[var(--sage)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function SectionTabs() {
  const pathname = usePathname();
  const { access } = useChildProfile();

  if (pathname.startsWith("/registro")) {
   const tabs = DAY.filter(
     (t) =>
       (t.href !== "/registro/medicinas" || access.medications) &&
       (t.href !== "/registro/bienestar" || access.wellbeing)
   );    return <Tabs label="Día a día" tabs={tabs} pathname={pathname} />;
  }
  if (PLAN.some((t) => pathname.startsWith(t.href))) return <Tabs label="Plan" tabs={PLAN} pathname={pathname} />;

  if (MORE.some((p) => pathname.startsWith(p)))
    return (
      <Link
        href="/mas"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--primary)] md:hidden"
      >
        <ChevronLeft size={18} aria-hidden />
        Más
      </Link>
    );

  return null;
}