"use client";

import { useState } from "react";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";

export default function HelpsSection() {
  const { child } = useChild();
  const { profile, editable, saveProfile } = useChildProfile();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await saveProfile({ helps_text: text.trim() || null });
    setBusy(false);
    if (err) setMsg(err);
    else setEditing(false);
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Lo que nos ayuda</h2>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => {
              setText(profile?.helps_text ?? "");
              setMsg("");
              setEditing(true);
            }}
            className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar
          </button>
        )}
      </div>

      {!editing ? (
        profile?.helps_text ? (
          <p className="mt-3 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{profile.helps_text}</p>
        ) : (
          <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
            Aquí la familia cuenta qué lo calma, qué señales muestra cuando está incómodo, qué evitar y
            qué le gusta. Ayuda a que todo el equipo acompañe igual.
          </p>
        )
      ) : (
        <form onSubmit={save} className="mt-3 grid gap-3">
          <label className="grid gap-1.5 text-xs font-semibold">
            ¿Qué le ayuda a {child.name}?
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              rows={6}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
            />
          </label>
          <p className="text-xs text-[var(--muted)]">{text.length} de 1000 caracteres</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </section>
  );
}