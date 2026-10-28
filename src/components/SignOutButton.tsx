"use client";

import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => supabase.auth.signOut()}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--sage)] hover:text-[var(--primary)]"
    >
      <LogOut size={14} aria-hidden />
      Salir
    </button>
  );
}