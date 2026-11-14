"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import {
  APPETITE,
  DAY_MOODS,
  NB_COLS,
  SIDE_OF,
  SLEEP,
  daysAgo,
  nbError,
  optLabel,
  sideLabel,
  suggestFromRecords,
  type Entry,
  type Side,
} from "@/lib/notebook";

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

const DAY_CHIPS = [
  { n: 0, label: "Hoy" },
  { n: 1, label: "Ayer" },
  { n: 2, label: "Hace 2 días" },
  { n: 3, label: "Hace 3 días" },
];

const areaCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";

export default function Cuaderno() {
  const { child, userId, role } = useChild();
  const { get } = useProfiles();
  const mySide: Side | undefined = SIDE_OF[role];
  const isFamily = role === "familia";

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [note, setNote] = useState("");

  const [selected, setSelected] = useState(daysAgo(0));
  const [mood, setMood] = useState("");
  const [appetite, setAppetite] = useState("");
  const [sleep, setSleep] = useState("");
  const [highlights, setHighlights] = useState("");
  const [headsUp, setHeadsUp] = useState("");
  const [request, setRequest] = useState("");

  const marked = useRef<Set<string>>(new Set());
  const nameOf = (id: string | null) => (id ? get(id)?.name ?? "Alguien del equipo" : "");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("notebook_entries")
      .select(NB_COLS)
      .eq("child_id", child.id)
      .gte("day", daysAgo(14))
      .order("day", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) setError("No se pudo cargar el cuaderno.");
    else {
      setError("");
      setEntries(data as Entry[]);
    }
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`notebook:${child.id}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "notebook_entries" }, () => load());
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  // Al abrir el cuaderno, las notas del otro lado quedan como vistas
  useEffect(() => {
    if (!mySide) return;
    for (const e of entries) {
      if (e.author_id !== userId && e.side !== mySide && !e.seen_at && !marked.current.has(e.id)) {
        marked.current.add(e.id);
        supabase.rpc("mark_notebook_seen", { eid: e.id }).then(
          () => {},
          () => {}
        );
      }
    }
  }, [entries, mySide, userId]);

  const own = entries.find((e) => e.day === selected && e.author_id === userId);
  const editable = !!mySide && selected >= daysAgo(3);

  useEffect(() => {
    const ex = entries.find((e) => e.day === selected && e.author_id === userId);
    setMood(ex?.mood ?? "");
    setAppetite(ex?.appetite ?? "");
    setSleep(ex?.sleep ?? "");
    setHighlights(ex?.highlights ?? "");
    setHeadsUp(ex?.heads_up ?? "");
    setRequest(ex?.request ?? "");
    setNote("");
  }, [selected, entries, userId]);

  const prefill = async () => {
    setNote("");
    const s = await suggestFromRecords(child.id, selected);
    if (s.used.length === 0) {
      setNote("No encontré registros de ese día que tu rol pueda ver.");
      return;
    }
    if (s.mood && !mood) setMood(s.mood);
    if (s.appetite && !appetite) setAppetite(s.appetite);
    if (s.sleep && !sleep) setSleep(s.sleep);
    setNote(`Se sugirió a partir de ${s.used.join(", ")}. Revísalo antes de guardar.`);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      mood: mood || null,
      appetite: appetite || null,
      sleep: sleep || null,
      highlights: highlights.trim() || null,
      heads_up: headsUp.trim() || null,
      request: request.trim() || null,
    };
    if (Object.values(payload).every((v) => v === null)) {
      setError("Elige o escribe algo antes de guardar.");
      return;
    }
    setBusy(true);
    setError("");
    let err: { message?: string; code?: string } | null = null;
    if (own) {
      const { data, error } = await supabase.from("notebook_entries").update(payload).eq("id", own.id).select("id");
      if (error) err = error;
      else if (!data?.length) err = { message: "" };
    } else {
      const { error } = await supabase.from("notebook_entries").insert({ child_id: child.id, day: selected, ...payload });
      if (error) err = error;
    }
    setBusy(false);
    if (err) {
      setError(nbError(err));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  };

  const removeOwn = async (e: Entry) => {
    if (!window.confirm("¿Quitar esta nota del cuaderno?")) return;
    const { data, error } = await supabase.from("notebook_entries").delete().eq("id", e.id).select("id");
    if (error || !data?.length) setError("No se pudo quitar la nota.");
    else load();
  };

  const chip = (active: boolean) =>
    `flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  const radioGroup = (
    legend: string,
    name: string,
    list: readonly { key: string; label: string; emoji?: string }[],
    value: string,
    set: (v: string) => void
  ) => (
    <fieldset className="grid gap-2">
      <legend className="text-xs font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {list.map((o) => (
          <label key={o.key} className={chip(value === o.key)}>
            <input type="radio" name={name} checked={value === o.key} onChange={() => set(o.key)} className="sr-only" />
            {o.emoji && (
              <span aria-hidden className="mr-2">
                {o.emoji}
              </span>
            )}
            {o.label}
          </label>
        ))}
        {value && (
          <button
            type="button"
            onClick={() => set("")}
            className="min-h-11 rounded-full px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
          >
            Quitar
          </button>
        )}
      </div>
    </fieldset>
  );

  const entryCard = (e: Entry) => {
    const mine = e.author_id === userId;
    const canRemove = mine ? e.day >= daysAgo(3) : isFamily;
    return (
      <li key={e.id} className="rounded-xl border border-[var(--border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <strong className="text-sm">{nameOf(e.author_id)}</strong>
          {canRemove && (
            <button
              type="button"
              onClick={() => removeOwn(e)}
              className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Quitar
            </button>
          )}
        </div>
        <dl className="mt-2 grid gap-1.5 text-sm">
          {e.mood && (
            <div>
              <dt className="inline font-semibold">Cómo estuvo el día: </dt>
              <dd className="inline">
                <span aria-hidden>{DAY_MOODS.find((m) => m.key === e.mood)?.emoji} </span>
                {optLabel(DAY_MOODS, e.mood)}
              </dd>
            </div>
          )}
          {e.appetite && (
            <div>
              <dt className="inline font-semibold">Comió: </dt>
              <dd className="inline">{optLabel(APPETITE, e.appetite)}</dd>
            </div>
          )}
          {e.sleep && (
            <div>
              <dt className="inline font-semibold">Durmió: </dt>
              <dd className="inline">{optLabel(SLEEP, e.sleep)}</dd>
            </div>
          )}
          {e.highlights && (
            <div>
              <dt className="inline font-semibold">Logros: </dt>
              <dd className="inline whitespace-pre-wrap [overflow-wrap:anywhere]">{e.highlights}</dd>
            </div>
          )}
          {e.heads_up && (
            <div>
              <dt className="inline font-semibold">A tener en cuenta: </dt>
              <dd className="inline whitespace-pre-wrap [overflow-wrap:anywhere]">{e.heads_up}</dd>
            </div>
          )}
          {e.request && (
            <div>
              <dt className="inline font-semibold">Pedido para mañana: </dt>
              <dd className="inline whitespace-pre-wrap [overflow-wrap:anywhere]">{e.request}</dd>
            </div>
          )}
        </dl>
        {e.seen_at && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Visto por {nameOf(e.seen_by)} ·{" "}
            {new Date(e.seen_at).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </li>
    );
  };

  const sideColumn = (side: Side) => {
    const list = entries.filter((e) => e.day === selected && e.side === side);
    return (
      <section aria-labelledby={`side-${side}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 id={`side-${side}`} className="text-lg font-semibold">
          {sideLabel(side)}
        </h2>
        {list.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Todavía no hay nota de {side === "escuela" ? "la escuela" : "la casa"} este día.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3">{list.map(entryCard)}</ul>
        )}
      </section>
    );
  };

  const requests = mySide
    ? entries.filter((e) => e.side !== mySide && e.request && (e.day === daysAgo(0) || e.day === daysAgo(1)))
    : [];

  const older = entries.filter((e) => e.day < daysAgo(3));
  const olderDays = Array.from(new Set(older.map((e) => e.day)));

  return (
    <div className="grid max-w-4xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuaderno escuela–casa</h1>
        <p className="mt-1 text-[var(--muted)]">
          Una nota diaria para que escuela y casa sepan cómo viene {child.name}.
          {!mySide && " Con tu rol solo puedes leerlo."}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {requests.length > 0 && (
        <section aria-label="Pedidos del otro lado" className="rounded-2xl bg-[var(--sand)] p-5 text-[var(--sand-text)]">
          <h2 className="text-base font-semibold">Pedidos de {sideLabel(requests[0].side).toLowerCase()}</h2>
          <ul className="mt-2 grid gap-2 text-sm">
            {requests.map((r) => (
              <li key={r.id} className="[overflow-wrap:anywhere]">
                <strong>{r.day === daysAgo(0) ? "Hoy" : "Ayer"}:</strong> {r.request}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Día">
        {DAY_CHIPS.map((c) => (
          <button
            key={c.n}
            type="button"
            onClick={() => setSelected(daysAgo(c.n))}
            aria-pressed={selected === daysAgo(c.n)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
              selected === daysAgo(c.n)
                ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
                : "border-[var(--border)] hover:bg-[var(--sage)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-sm capitalize text-[var(--muted)]">{longDay(selected)}</p>

      <div className="grid gap-4 md:grid-cols-2">
        {sideColumn("escuela")}
        {sideColumn("casa")}
      </div>

      {editable && mySide && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">
            {own ? "Tu nota de este día" : `Escribir la nota de ${mySide === "escuela" ? "la escuela" : "la casa"}`}
          </h2>
          <form onSubmit={save} className="mt-4 grid gap-5">
            <div>
              <button type="button" onClick={prefill} className={ghost}>
                Rellenar con lo registrado hoy
              </button>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Solo usa lo que tu rol ya puede ver en la app. Tú decides qué dejar.
              </p>
              {note && (
                <p role="status" className="mt-2 text-sm text-[var(--primary)]">
                  {note}
                </p>
              )}
            </div>

            {radioGroup("Cómo estuvo el día", "mood", DAY_MOODS, mood, setMood)}
            {radioGroup("Cómo comió", "appetite", APPETITE, appetite, setAppetite)}
            {radioGroup("Cómo durmió anoche", "sleep", SLEEP, sleep, setSleep)}

            <label className="grid gap-1.5 text-xs font-semibold">
              Logros o lo bueno del día (opcional)
              <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} maxLength={300} rows={2} className={areaCls} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Algo a tener en cuenta (opcional)
              <textarea value={headsUp} onChange={(e) => setHeadsUp(e.target.value)} maxLength={300} rows={2} className={areaCls} />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Pedido para mañana (opcional)
              <textarea value={request} onChange={(e) => setRequest(e.target.value)} maxLength={300} rows={2} className={areaCls} />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy} className={primary}>
                {busy ? "Guardando…" : own ? "Actualizar nota" : "Guardar nota"}
              </button>
              {saved && (
                <span role="status" className="text-sm font-medium text-[var(--primary)]">
                  ✓ Guardado
                </span>
              )}
            </div>
            {own && (
              <p className="text-xs text-[var(--muted)]">
                Si cambias tu nota, vuelve a quedar como «no vista» para el otro lado.
              </p>
            )}
          </form>
        </section>
      )}

      {olderDays.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Días anteriores</h2>
          <div className="mt-3 grid gap-5">
            {olderDays.map((d) => (
              <div key={d}>
                <h3 className="text-sm font-semibold capitalize">{longDay(d)}</h3>
                <ul className="mt-2 grid gap-3">
                  {older
                    .filter((e) => e.day === d)
                    .map((e) => (
                      <div key={e.id}>
                        <p className="mb-1 text-xs font-semibold text-[var(--muted)]">{sideLabel(e.side)}</p>
                        <ul className="grid gap-3">{entryCard(e)}</ul>
                      </div>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        El cuaderno es para compartir lo cotidiano. Las notas las ve todo el equipo, así que cuida no escribir
        datos que no quieras compartir con todos. Se puede escribir y editar hasta 3 días atrás.
      </div>
    </div>
  );
}