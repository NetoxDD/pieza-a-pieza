"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import Avatar from "@/components/Avatar";
import { roleLabel } from "@/lib/roles";
import { clearCopies } from "@/lib/emergency";
import { useDismiss } from "@/lib/useDismiss";

export default function UserMenu() {
  const { child, role, userId, userName } = useChild();
  const { get } = useProfiles();
  const me = get(userId);
  const name = me?.name || userName || "Mi cuenta";

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, () => setOpen(false), wrapRef, btnRef);

  const signOut = async () => {
    setOpen(false);
    clearCopies(); // la copia de la ficha de emergencia no debe quedar en el dispositivo
    await supabase.auth.signOut();
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Menú de ${name}`}
        className={`grid min-h-11 min-w-11 place-items-center rounded-full ring-2 transition ${
          open ? "ring-[var(--primary)]" : "ring-transparent hover:ring-[var(--border)]"
        }`}
      >
        <Avatar profile={me} name={name} size={36} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[85vw] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar profile={me} name={name} size={40} />
            <div className="min-w-0 leading-tight">
              <strong className="block truncate text-sm">{name}</strong>
              <small className="block text-xs text-[var(--muted)]">
                {roleLabel[role] ?? role} en el espacio de {child.name}
              </small>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-1">
            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold hover:bg-[var(--sage)]"
            >
              <User size={16} aria-hidden />
              Mi perfil
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-[var(--sage)]"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}