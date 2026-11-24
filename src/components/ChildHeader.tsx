"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronDown, Menu, Plus } from "lucide-react";
import { BASE } from "@/lib/base";
import { toggleSidebar, useSidebarMin } from "@/lib/sidebar";
import RegisterMenu from "@/components/RegisterMenu";
import AlertsMenu from "@/components/AlertsMenu";
import HelpMenu from "@/components/HelpMenu";
import { useChild } from "@/components/ChildGate";
import EmergencyButton from "@/components/EmergencyButton";
import UserMenu from "@/components/UserMenu";
import { roleLabel } from "@/lib/roles";
import { childColor, initials } from "@/lib/childColor";
import { useDismiss } from "@/lib/useDismiss";

export default function ChildHeader() {
  const { child, kids, switchChild, startAdding } = useChild();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, () => setOpen(false), wrapRef, btnRef);
  const color = childColor(child.id, child.accent);
  const min = useSidebarMin();

  return (
    <header
      className="sticky top-0 z-40 flex h-[var(--header-h)] items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 md:gap-3 md:px-5"
      style={{ borderTop: `4px solid ${color.bar}` }}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={min ? "Mostrar el menú" : "Ocultar el menú"}
        aria-expanded={!min}
        className="hidden min-h-11 min-w-11 place-items-center rounded-xl hover:bg-[var(--sage)] md:grid"
      >
        <Menu size={22} aria-hidden />
      </button>
      <Link href="/" aria-label="Pieza a pieza, ir al inicio" className="hidden shrink-0 items-center gap-2 md:flex">
        <Image src={`${BASE}/logo.png`} alt="" width={36} height={36} />
        <span className="hidden text-lg font-bold leading-none tracking-tight lg:inline">
          Pieza <span className="text-[var(--primary)]">a pieza</span>
        </span>
      </Link>

      <div ref={wrapRef} className="relative min-w-0">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`Niño activo: ${child.name}. Cambiar de niño`}
          className="flex min-h-11 max-w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-[var(--background)]"
        >
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
            style={{ background: color.bg, color: color.fg }}
          >
            {initials(child.name)}
          </span>
          <strong className="min-w-0 truncate text-sm">{child.name}</strong>
          <ChevronDown size={16} aria-hidden className="shrink-0 text-[var(--muted)]" />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[85vw] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
            <p className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">Cambiar de niño</p>
            <ul>
              {kids.map((k) => {
                const c = childColor(k.id, k.accent);
                const current = k.id === child.id;
                return (
                  <li key={k.id}>
                    <button
                      type="button"
                      aria-current={current ? "true" : undefined}
                      onClick={() => {
                        setOpen(false);
                        if (!current) switchChild(k.id);
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--sage)]"
                    >
                      <span
                        aria-hidden
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold"
                        style={{ background: c.bg, color: c.fg }}
                      >
                        {initials(k.name)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <strong className="block truncate text-sm">{k.name}</strong>
                        <small className="block truncate text-xs text-[var(--muted)]">
                          {roleLabel[k.role] ?? k.role}
                        </small>
                      </span>
                      {current && <Check size={16} aria-hidden className="text-[var(--primary)]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 border-t border-[var(--border)] pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  startAdding();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                <Plus size={16} aria-hidden />
                Añadir otro niño o usar un código
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <RegisterMenu />
        <AlertsMenu />
        <div className="hidden md:block">
          <HelpMenu />
        </div>
        <EmergencyButton />
        <UserMenu />
      </div>
    </header>
  );
}