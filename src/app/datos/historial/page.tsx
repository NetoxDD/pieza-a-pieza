"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import { CATEGORIES, categoryLabel, describe, type AuditRow, type Category } from "@/lib/audit";

const PAGE = 100;
const MAX = 1000;

export default function Historial() {
  const { child, userId } = useChild();
  const { get } = useProfiles();

  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cat, setCat] = useState<Category | "todas">("todas");
  const [person, setPerson] = useState("todas");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("children").select("created_by").eq("id", child.id).single();
      if (!cancelled) setIsOwner(data?.created_by === userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id, userId]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id,created_at,actor_id,action,entity,entity_id,detail")
        .eq("child_id", child.id)
        .order("id", { ascending: false })
        .range(offset, offset + PAGE - 1);
      if (error) {
        setError("No se pudo cargar el historial.");
        return;
      }
      setError("");
      const list = data as AuditRow[];
      setRows((prev) => (offset === 0 ? list : [...prev, ...list]));
      setMore(list.length === PAGE && offset + PAGE < MAX);
    },
    [child.id]
  );

  useEffect(() => {
    if (isOwner) fetchPage(0).then(() => setLoading(false));
    else if (isOwner === false) setLoading(false);
  }, [isOwner, fetchPage]);

  const nameOf = (id: string | null) =>
    id ? get(id)?.name ?? "Una persona del equipo" : "El sistema";

  const purge = async () => {
    if (!window.confirm("¿Borrar los registros de más de 12 meses? No se puede deshacer.")) return;
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.rpc("purge_audit", { cid: child.id });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg(`Se borraron ${data as number} registros antiguos.`);
    fetchPage(0);
  };

  if (isOwner === false) {
    return (
      <div className="grid max-w-2xl gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Historial de accesos y cambios</h1>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Solo el familiar principal puede ver el historial.
        </p>
      </div>
    );
  }

  const described = rows.map((r) => ({ r, ...describe(r, nameOf) }));
  const actors = Array.from(new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x)));
  const shown = described.filter(
    (x) => (cat === "todas" || x.cat === cat) && (person === "todas" || x.r.actor_id === person)
  );

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <Link href="/datos" className="text-xs font-semibold text-[var(--primary)] hover:underline">
          ← Datos y privacidad
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Historial de accesos y cambios</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lo que ha pasado en el espacio de {child.name}. Solo lo ves tú, como familiar principal.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
        <button type="button" onClick={() => setCat("todas")} aria-pressed={cat === "todas"} className={chip(cat === "todas")}>
          Todo
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCat(c.value)}
            aria-pressed={cat === c.value}
            className={chip(cat === c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {actors.length > 1 && (
        <label className="grid max-w-xs gap-1.5 text-xs font-semibold">
          Persona
          <select
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
          >
            <option value="todas">Todas</option>
            {actors.map((id) => (
              <option key={id} value={id}>
                {nameOf(id)}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && shown.length === 0 && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          No hay eventos con esos filtros.
        </p>
      )}

      <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6">
        {shown.map(({ r, text, cat: c }) => (
          <li key={r.id} className="py-4">
            <p className="text-sm [overflow-wrap:anywhere]">{text}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
              <time dateTime={r.created_at}>
                {new Date(r.created_at).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <span className="rounded-md bg-[var(--sage)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--primary)]">
                {categoryLabel[c]}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {more && (
        <div>
          <button
            type="button"
            onClick={() => fetchPage(rows.length)}
            className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Cargar más
          </button>
        </div>
      )}
      {!more && rows.length >= MAX && (
        <p className="text-xs text-[var(--muted)]">Se muestran los últimos {MAX} eventos.</p>
      )}

      <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Conservación</h2>
        <p className="text-sm text-[var(--muted)]">
          El historial se conserva 12 meses. Puedes borrar ahora los registros más antiguos.
        </p>
        <div>
          <button
            type="button"
            onClick={purge}
            disabled={busy}
            className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
          >
            {busy ? "Borrando…" : "Borrar registros de más de 12 meses"}
          </button>
        </div>
        {msg && (
          <p role="status" className="text-sm text-[var(--primary)]">
            {msg}
          </p>
        )}
      </section>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        <strong>Lo que este historial no puede decirte:</strong> la apertura de documentos la anota la app (una
        persona con conocimientos técnicos que ya tenga permiso para verlos podría evitarlo); los accesos a la
        ficha de emergencia <em>sin conexión</em> no quedan anotados; y el historial protege contra el uso indebido
        dentro de la app, no contra quien administra la base de datos. Nunca guarda contenidos, solo qué ocurrió,
        quién y cuándo.
      </div>
    </div>
  );
}