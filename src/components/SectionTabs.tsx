"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";

const PLAN = [
  { href: "/objetivos", label: "Objetivos" },
  { href: "/calendario", label: "Calendario" },
];
const MORE = ["/documentos", "/equipo"];

export default function SectionTabs() {
  const pathname = usePathname();

  if (PLAN.some((t) => pathname.startsWith(t.href)))
    return (
      <nav aria-label="Plan" className="mb-6 flex gap-2">
        {PLAN.map((t) => {
          const active = pathname.startsWith(t.href);
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