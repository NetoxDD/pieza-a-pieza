"use client";

import Link from "next/link";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";

export default function HelpsBanner() {
  const { child } = useChild();
  const { profile, canEdit } = useChildProfile();
  const text = profile?.helps_text?.trim();

  return (
    <section className="rounded-2xl bg-[var(--sage)] p-6">
      <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
        Lo que nos ayuda a conectar
      </p>
      {text ? (
        <>
          <p className="mt-2 line-clamp-4 max-w-3xl whitespace-pre-wrap text-lg [overflow-wrap:anywhere]">
            {text}
          </p>
          <Link href="/ficha" className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline">
            Ver la ficha completa →
          </Link>
        </>
      ) : (
        <>
          <h2 className="mt-2 text-2xl font-medium">Mucho por descubrir, a su ritmo.</h2>
          <p className="mt-2 max-w-3xl text-[var(--muted)]">
            {canEdit ? (
              <Link href="/ficha" className="font-semibold text-[var(--primary)] hover:underline">
                Cuenta qué le ayuda a {child.name} →
              </Link>
            ) : (
              "La familia aún no ha escrito qué le ayuda."
            )}
          </p>
        </>
      )}
    </section>
  );
}