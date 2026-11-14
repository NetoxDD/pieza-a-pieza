"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import EpisodeForm from "@/components/episodes/EpisodeForm";
import EpisodeCard from "@/components/episodes/EpisodeCard";
import { EP_COLS, INTENSITY, PLACES, type Episode } from "@/lib/episodes";

const PERIODS = [
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "1 año" },
];

export default function Episodios() {
  const { child, userId, role } = useChild();
  const { get } = useProfiles();
  const isFamily = role === "familia";
  const canRegister = role !== "pediatra";

  const [eps, setEps] = useState<Episode[]>([]);
  const [detonantes, setDetonantes] = useState<string[]>([]);
  const [ayudas, setAyudas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Episode | null>(null);
  const [saved, setSaved] = useState(false);

  const [days, setDays] = useState(30);
  const [intensity, setIntensity] = useState(0);
  const [place, setPlace] = useState("");

  const load = useCallback(async () => {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const [e, p] = await Promise.all([
      supabase
        .from("episodes")
        .select(EP_COLS)
        .eq("child_id", child.id)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase
        .from("calm_plan_items")
        .select("kind,body,position")
        .eq("child_id", child.id)
        .in("kind", ["detonante", "ayuda"])
        .order("position"),
    ]);
    if (e.error) {
      setError("No se pudieron cargar los episodios.");
    } else {
      setError("");
      setEps(e.data as Episode[]);
    }
    if (!p.error) {
      const items = p.data as { kind: string; body: string }[];
      setDetonantes(items.filter((x) => x.kind === "detonante").map((x) => x.body));
      setAyudas(items.filter((x) => x.kind === "ayuda").map((x) => x.body));
    }
    setLoading(false);
  }, [child.id, days]);

  useEffect(() => {
    load();
  }, [load]);

  const nameOf = (id: string) => get(id)?.name ?? "Alguien del equipo";

  const shown = eps.filter(
    (x) => (!intensity || x.intensity === intensity) && (!place || x.place === place)
  );
  const live = shown.filter((x) => !x.voided_at).length;

  const onDone = () => {
    setCreating(false);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  };

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Episodios</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lo que pasó antes, durante y después, para entender qué le ayuda a {child.name}. Describe lo que se
          observó, sin juicios.
        </p>
      </div>

      {canRegister && !creating && !editing && (
        <div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="min-h-12 rounded-xl bg-[var(--primary)] px-6 text-base font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            Registrar un episodio
          </button>
          {saved && (
            <span role="status" className="ml-3 text-sm font-medium text-[var(--primary)]">
              ✓ Guardado
            </span>
          )}
        </div>
      )}

      {(creating || editing) && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="mb-4 text-lg font-semibold">{editing ? "Editar episodio" : "Nuevo episodio"}</h2>
          <EpisodeForm
            initial={editing ?? undefined}
            detonantes={detonantes}
            ayudas={ayudas}
            onDone={onDone}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Periodo">
          {PERIODS.map((p) => (
            <button key={p.days} type="button" onClick={() => setDays(p.days)} aria-pressed={days === p.days} className={chip(days === p.days)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold">
            Intensidad
            <select
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
            >
              <option value={0}>Todas</option>
              {INTENSITY.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            Lugar
            <select
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
            >
              <option value="">Todos</option>
              {PLACES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <p className="mt-3 text-sm text-[var(--muted)]" aria-live="polite">
          {loading ? "Cargando…" : `${live} ${live === 1 ? "episodio" : "episodios"} en este periodo`}
          {!isFamily && role !== "pediatra" && role !== "terapeuta" && role !== "logopeda" && (
            <> (los que tú registraste, salvo que la familia haya abierto esta sección)</>
          )}
          .
        </p>

        <ul className="mt-2 divide-y divide-[var(--border)]">
          {!loading && shown.length === 0 && (
            <li className="py-6 text-sm text-[var(--muted)]">
              {eps.length === 0 ? "No hay episodios registrados en este periodo." : "Ninguno coincide con los filtros."}
            </li>
          )}
          {shown.map((ep) => (
            <EpisodeCard
              key={ep.id}
              ep={ep}
              nameOf={nameOf}
              userId={userId}
              isFamily={isFamily}
              onEdit={() => {
                setCreating(false);
                setEditing(ep);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onChanged={load}
            />
          ))}
        </ul>
        {eps.length >= 200 && (
          <p className="mt-2 text-xs text-[var(--muted)]">Se muestran los últimos 200 episodios del periodo.</p>
        )}
      </section>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Los episodios no se borran: se anulan con motivo. Quien lo registró puede editarlo y anularlo durante 24
        horas; después, solo la familia. Esta herramienta describe lo ocurrido: no diagnostica ni da
        recomendaciones médicas.
      </div>
    </div>
  );
}