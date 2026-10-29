"use client";

import { useChild } from "@/components/ChildGate";
import SignOutButton from "@/components/SignOutButton";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

export default function ChildHeader() {
  const { child, userName } = useChild();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 md:px-9">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sage)] text-xs font-bold text-[var(--primary)]">
          {initials(child.name)}
        </span>
        <div className="leading-tight">
          <strong className="block text-sm">{child.name}</strong>
          <small className="text-xs text-[var(--muted)]">Su espacio de seguimiento</small>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {userName && (
          <span className="hidden text-xs text-[var(--muted)] sm:block">Hola, {userName}</span>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}