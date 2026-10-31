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
  Menu,
  HeartPulse,
    Settings,
    User,
} from "lucide-react";
import { BASE } from "@/lib/base";

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
    ],
  },
  {
    title: "Archivo y equipo",
    items: [
      { href: "/documentos", label: "Documentos", icon: FileText },
      { href: "/equipo", label: "Equipo", icon: Users },
      { href: "/perfil", label: "Mi perfil", icon: User },
        { href: "/ajustes", label: "Ajustes", icon: Settings },
        { href: "/ficha", label: "Ficha del niño", icon: HeartPulse },
    ],
  },
];

const BOTTOM = [
  { href: "/", label: "Inicio", icon: Home, match: (p: string) => p === "/" },
  { href: "/registro", label: "Día a día", icon: ClipboardList, match: (p: string) => p.startsWith("/registro") },
  { href: "/comunicacion", label: "Mensajes", icon: MessageCircle, match: (p: string) => p.startsWith("/comunicacion") },
  {
    href: "/objetivos",
    label: "Plan",
    icon: Target,
    match: (p: string) => p.startsWith("/objetivos") || p.startsWith("/calendario"),
  },
  {
    href: "/mas,/perfil",
    label: "Más",
    icon: Menu,
    match: (p: string) =>   ["/mas", "/documentos", "/equipo", "/ajustes","/ficha"].some((x) => p.startsWith(x)),
  },
];

export default function Nav() {
  const pathname = usePathname();
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
                {g.items.map(({ href, label, icon: Icon }) => (
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
                    {label}
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
              <Icon size={20} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}