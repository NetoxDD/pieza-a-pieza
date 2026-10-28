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
} from "lucide-react";

const items = [
  { href: "/", label: "Resumen", icon: Home },
  { href: "/registro", label: "Registro", icon: ClipboardList },
  { href: "/comunicacion", label: "Mensajes", icon: MessageCircle },
  { href: "/objetivos", label: "Objetivos", icon: Target },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/documentos", label: "Documentos", icon: FileText },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Barra lateral: tablet y escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] p-5 md:flex">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} />
          <span className="text-2xl font-bold leading-none tracking-tight">
            Pieza <span className="text-[var(--primary)]">a pieza</span>
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="mt-8 grid gap-1.5">
          {items.map(({ href, label, icon: Icon }) => (
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
        </nav>

        <div className="mt-auto rounded-xl bg-[var(--sage)] p-4 text-xs">
          <strong>Un espacio de confianza</strong>
          <p className="mt-1 text-[var(--muted)]">
            Demostración con datos de ejemplo.
          </p>
        </div>
      </aside>

      {/* Barra inferior: celular */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${
              isActive(href)
                ? "font-bold text-[var(--primary)]"
                : "text-[var(--muted)]"
            }`}
          >
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}