"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  MessageCircle,
  Target,
  CalendarDays,
  FileText,
  Users,
  Stethoscope,
  Menu,
  HeartPulse,
  User,
  Settings,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import { BASE } from "@/lib/base";
   import { useChild } from "@/components/ChildGate";
import { useToday } from "@/components/TodayProvider";

const GROUPS = [
  {
    title: "Seguimiento",
    items: [
      { href: "/", label: "Inicio", icon: Home },
      { href: "/registro", label: "Día a día", icon: ClipboardList },
      { href: "/comunicacion", label: "Mensajes", icon: MessageCircle },
    ],
  },
  {
    title: "Plan",
    items: [
      { href: "/objetivos", label: "Objetivos", icon: Target },
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      { href: "/material", label: "Material", icon: BookOpen },
    ],
  },
  {
    title: "Archivo y equipo",
    items: [
      { href: "/ficha", label: "Ficha del niño", icon: HeartPulse },
      { href: "/documentos", label: "Documentos", icon: FileText },
      { href: "/equipo", label: "Equipo", icon: Users },
         { href: "/informe", label: "Informe para el pediatra", icon: Stethoscope },
      { href: "/perfil", label: "Mi perfil", icon: User },
               { href: "/datos", label: "Datos y privacidad", icon: ShieldCheck },
      { href: "/ajustes", label: "Ajustes", icon: Settings },
    ],
  },
];

const MORE_ROUTES = ["/mas", "/ficha", "/documentos", "/equipo", "/perfil", "/ajustes","/informe","/datos","/privacidad"];

const BOTTOM = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/registro", label: "Día a día", icon: ClipboardList, match: (p: string) => p.startsWith("/registro") },
  { href: "/comunicacion", label: "Mensajes", icon: MessageCircle, match: (p: string) => p.startsWith("/comunicacion") },
  {
    href: "/objetivos",
    label: "Plan",
    icon: Target,
    match: (p: string) =>
      p.startsWith("/objetivos") || p.startsWith("/calendario") || p.startsWith("/material"),
  },
  {
    href: "/mas",
    label: "Más",
    icon: Menu,
    match: (p: string) => MORE_ROUTES.some((x) => p.startsWith(x)),
  },
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
     const { role } = useChild();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Barra lateral: tablet y escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--sidebar)] p-5 md:flex">
        <Link href="/" className="flex items-center gap-3">
          <Image src={`${BASE}/logo.png`} alt="" width={44} height={44} />
          <span className="text-2xl font-bold leading-none tracking-tight">
            Pieza <span className="text-[var(--primary)]">a pieza</span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="mt-8 grid gap-5">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-1.5 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-[var(--muted)]">
                {g.title}
              </p>
              <div className="grid gap-1">
                   {g.items
     .filter((i) => i.href !== "/informe" || role === "familia")
     .map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
                      isActive(href)
                        ? "bg-[var(--sage)] font-bold text-[var(--primary)]"
                        : "text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                    }`}
                  >
                    <Icon size={18} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {href === "/registro" && attention && <AttentionDot />}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto rounded-xl bg-[var(--sage)] p-4 text-xs">
          <strong>Un espacio de confianza</strong>
          <p className="mt-1 text-[var(--muted)]">Proyecto escolar con datos de ejemplo.</p>
        </div>
      </aside>

      {/* Barra inferior: celular */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {BOTTOM.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] ${
                active ? "font-bold text-[var(--primary)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="relative">
                <Icon size={20} aria-hidden />
                {href === "/registro" && attention && (
                  <AttentionDot className="absolute -right-1 -top-1" />
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}