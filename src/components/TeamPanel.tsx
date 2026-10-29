"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

const roleLabel: Record<string, string> = {
  familia: "Familia",
  logopeda: "Logopeda",
  terapeuta: "Terapeuta ocupacional",
  tutor: "Tutor",
  pediatra: "Pediatra",
};

type Member = { user_id: string; role: string; name: string };

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

export default function TeamPanel() {
  const { child, userId } = useChild();
  const [members, setMembers] = useState<Member[]>([]);
  const [isFamily, setIsFamily] = useState(false);
  const [role, setRole] = useState("tutor");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [mem, prof] = await Promise.all([
      supabase.from("child_members").select("user_id,role").eq("child_id", child.id),
      supabase.from("profiles").select("id,full_name"),
    ]);
    if (mem.error || prof.error) {
      setError("No se pudo cargar el equipo.");
      return;
    }
    const names = Object.fromEntries(prof.data.map((p) => [p.id, p.full_name]));
    const list = mem.data.map((m) => ({ ...m, name: names[m.user_id] || "Sin nombre" }));
    setMembers(list);
    setIsFamily(list.some((m) => m.user_id === userId && m.role === "familia"));
  }, [child.id, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError("");
    setCode("");
    setCopied(false);
    const { data, error } = await supabase.rpc("create_invite", { cid: child.id, r: role });
    setBusy(false);
    if (error) setError("No se pudo crear la invitación.");
    else setCode(data as string);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el código y cópialo a mano.");
    }
  };

  return (
    <section id="equipo" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Aquí estamos</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Personas que acompañan el seguimiento.</p>

      <ul className="mt-5 grid gap-4">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3">
            <span
              aria-hidden
              className={`grid h-10 w-10 place-items-center rounded-full text-xs font-bold ${
                m.role === "familia"
                  ? "bg-[var(--sage)] text-[var(--primary)]"
                  : "bg-[var(--blue)] text-[var(--blue-text)]"
              }`}
            >
              {initials(m.name)}
            </span>
            <div>
              <strong className="block text-sm leading-tight">
                {m.name}
                {m.user_id === userId && " (tú)"}
              </strong>
              <small className="text-xs text-[var(--muted)]">{roleLabel[m.role] ?? m.role}</small>
            </div>
          </li>
        ))}
      </ul>

      {isFamily && (
        <div className="mt-6 grid gap-3 border-t border-[var(--border)] pt-5">
          <h3 className="text-sm font-semibold">Invitar a alguien del equipo</h3>
          <label className="grid gap-1.5 text-xs font-semibold">
            Rol que tendrá
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
            >
              {Object.entries(roleLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? "Generando…" : "Generar código"}
          </button>

          {code && (
            <div className="rounded-xl bg-[var(--blue)] p-4" role="status">
              <p className="text-xs text-[var(--blue-text)]">
                Comparte este código. Sirve una sola vez y vence en 7 días.
              </p>
              <p className="mt-2 select-all text-xl font-bold tracking-widest">{code}</p>
              <button
                type="button"
                onClick={copy}
                className="mt-3 min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                {copied ? "✓ Copiado" : "Copiar código"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}