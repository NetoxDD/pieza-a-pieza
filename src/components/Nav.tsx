"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, MessageCircle, Target, Menu } from "lucide-react";
import { useToday } from "@/components/TodayProvider";
import { useSidebarMin } from "@/lib/sidebar";
import { useSettings } from "@/components/SettingsProvider";

// Las 5 secciones principales. Todo lo demás está dentro de "Más".
const MORE_ROUTES = ["/mas", "/ficha", "/documentos", "/equipo", "/perfil", "/ajustes", "/informe", "/datos", "/privacidad", "/plan-calma", "/patrones", "/ninos"];

const ALL_ITEMS = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/registro", label: "Día a día", icon: ClipboardList, match: (p: string) => p.startsWith("/registro") },
  {
    href: "/objetivos",
    label: "Plan",
    icon: Target,
    match: (p: string) =>
      p.startsWith("/objetivos") || p.startsWith("/calendario") || p.startsWith("/material") || p.startsWith("/logros"),
  },
  { href: "/comunicacion", label: "Mensajes", icon: MessageCircle, match: (p: string) => p.startsWith("/comunicacion") },
  { href: "/mas", label: "Más", icon: Menu, match: (p: string) => MORE_ROUTES.some((x) => p.startsWith(x)) },
];

function AttentionDot({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Hay tomas sin registrar"
      className={`h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--danger)] ${className}`}
    />
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { attention } = useToday();
  const min = useSidebarMin();
  const { settings } = useSettings();
  // En la vista sencilla "Plan" se mueve a "Más"
  const items = settings.simple ? ALL_ITEMS.filter((i) => i.href !== "/objetivos") : ALL_ITEMS;

  return (
    <>
      {/* Menú lateral plegable: tablet y escritorio */}
      <aside
        className="side-pad fixed bottom-0 left-0 top-[var(--header-h)] z-30 hidden w-[var(--side-w)] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] p-3 md:flex"
        style={{ transition: "width 0.2s ease" }}
      >
        <nav aria-label="Navegación principal" className="grid gap-1.5">
          {items.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                title={min ? label : undefined}
                aria-label={min ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-12 items-center rounded-xl text-base transition-colors ${
                  min ? "justify-center" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-[var(--sage)] font-bold text-[var(--primary)]"
                    : "text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                }`}
              >
                <Icon size={22} aria-hidden />
                {!min && <span className="flex-1">{label}</span>}
                {href === "/registro" && attention && (
                  <AttentionDot className={min ? "absolute right-2 top-2" : ""} />
                )}
              </Link>
            );
          })}
        </nav>

        {!min && (
          <div className="mt-auto rounded-xl bg-[var(--sage)] p-4 text-xs">
            <strong>Un espacio de confianza</strong>
            <p className="mt-1 text-[var(--muted)]">Proyecto escolar con datos de ejemplo.</p>
          </div>
        )}
      </aside>

      {/* Barra inferior: celular */}
      <nav
        aria-label="Navegación principal"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {items.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] ${
                active ? "font-bold text-[var(--primary)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="relative">
                <Icon size={22} aria-hidden />
                {href === "/registro" && attention && <AttentionDot className="absolute -right-1 -top-1" />}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
