"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";

export default function ConsentCard() {
  const { child } = useChild();
  const { reload } = useChildProfile();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("give_health_consent", { cid: child.id });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    await reload();
    setBusy(false);
  };

  return (
    <section className="grid gap-4 rounded-2xl border-2 border-[var(--primary)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Antes de empezar</h2>
      <p className="text-sm">
        La ficha de {child.name} guarda información personal y de salud de un menor: fecha de
        nacimiento, alergias, contactos y más. Solo la verán las personas del equipo que tú
        invitaste, según su rol, y tú decides qué escribir.
      </p>
      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
        />
        <span>
          Soy madre, padre o tutor legal de {child.name} y autorizo guardar estos datos en esta
          aplicación.
        </span>
      </label>
      <p className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[var(--sand-text)]">
        Proyecto escolar: usa datos de ejemplo, no información real de un menor.
      </p>
      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <div>
        <button
          type="button"
          onClick={confirm}
          disabled={!checked || busy}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Confirmo y quiero empezar"}
        </button>
      </div>
    </section>
  );
}