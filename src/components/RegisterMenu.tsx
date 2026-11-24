"use client";

import Link from "next/link";
import { Moon, Pencil, Pill, Plus, Smile, TriangleAlert } from "lucide-react";
import HeaderMenu from "@/components/HeaderMenu";
import { useChildProfile } from "@/components/ChildProfileProvider";

export default function RegisterMenu() {
  const { access } = useChildProfile();
  const items = [
    { href: "/#animo", label: "Cómo está hoy", icon: Smile, show: true },
    { href: "/registro/medicinas", label: "Dar una medicina", icon: Pill, show: access.medications },
    { href: "/registro/observaciones", label: "Anotar algo que noté", icon: Pencil, show: true },
    { href: "/registro/bienestar", label: "Cómo durmió y comió", icon: Moon, show: access.wellbeing },
    { href: "/registro/episodios", label: "Un momento difícil", icon: TriangleAlert, show: access.episodes },
  ].filter((i) => i.show);

  return (
    <HeaderMenu
      label="Registrar algo"
      buttonClass="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-3 text-sm font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] sm:px-4"
      button={
        <>
          <Plus size={20} aria-hidden />
          <span className="hidden sm:inline">Registrar</span>
        </>
      }
      panelClass="w-72"
    >
      {(close) => (
        <>
          <p className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">¿Qué quieres anotar?</p>
          <ul>
            {items.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-[var(--sage)]"
                >
                  <Icon size={18} aria-hidden className="text-[var(--primary)]" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </HeaderMenu>
  );
}
