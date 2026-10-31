"use client";

import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import ConsentCard from "@/components/ficha/ConsentCard";
import IdentitySection from "@/components/ficha/IdentitySection";
import AllergiesSection from "@/components/ficha/AllergiesSection";
import ContactsSection from "@/components/ficha/ContactsSection";
import HelpsSection from "@/components/ficha/HelpsSection";

export default function Ficha() {
  const { child } = useChild();
  const { loading, error, canEdit, consented } = useChildProfile();

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ficha de {child.name}</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lo esencial para acompañarle bien. Solo la familia puede editarla.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && canEdit && !consented && <ConsentCard />}

      {!loading && !canEdit && !consented && (
        <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          La familia aún no ha completado la ficha.
        </p>
      )}

      {!loading && (
        <>
          <IdentitySection />
          <AllergiesSection />
          <ContactsSection />
          <HelpsSection />
        </>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Esta ficha la escribe la familia y no sustituye la valoración de profesionales de la salud.
        Proyecto escolar: usa datos de ejemplo.
      </div>
    </div>
  );
}