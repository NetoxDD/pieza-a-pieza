"use client";

import { useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { MARK_ROLES, hhmm, isoWeekday, localDate, type Routine, type Step } from "@/lib/routines";
import { stepEmoji } from "@/lib/kids";

type Item = Step & { place: Routine["place"] };
type Place = "todo" | "casa" | "escuela";

export default function KidRoutine() {
  const { child, role } = useChild();
  const canMark = MARK_ROLES.includes(role);

  const [items, setItems] = useState<Item[]>([]);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [place, setPlace] = useState<Place>("todo");

  const load = useCallback(async () => {
    const now = new Date();
    const day = localDate(now);
    const r = await supabase
      .from("routines")
      .select("id,name,place,days,position,active")
      .eq("child_id", child.id)
      .eq("active", true)
      .order("position");
    if (r.error) {
      setError("No se pudo cargar. Pide ayuda a un adulto.");
      setLoading(false);
      return;
    }
    const todays = (r.data as Routine[]).filter((x) => x.days.includes(isoWeekday(now)));
    if (todays.length === 0) {
      setItems([]);
      setDone({});
      setLoading(false);
      return;
    }
    const ids = todays.map((x) => x.id);
    const [o, s] = await Promise.all([
      supabase.from("routine_overrides").select("routine_id").eq("day", day).in("routine_id", ids),
      supabase
        .from("routine_steps")
        .select("id,routine_id,title,at_time,emoji,note,position")
        .in("routine_id", ids),
    ]);
    const skipped = new Set((o.data ?? []).map((x) => x.routine_id as string));
    const placeOf = new Map(todays.map((x) => [x.id, x.place]));
    const steps = ((s.data ?? []) as Step[])
      .filter((x) => !skipped.has(x.routine_id))
      .map((x) => ({ ...x, place: placeOf.get(x.routine_id) ?? "ambos" }) as Item)
      .sort(
        (a, b) =>
          (a.at_time ?? "99:99").localeCompare(b.at_time ?? "99:99") || a.position - b.position
      );

    let marks: string[] = [];
    if (steps.length > 0) {
      const d = await supabase
        .from("routine_step_done")
        .select("step_id")
        .eq("day", day)
        .in("step_id", steps.map((x) => x.id));
      marks = (d.data ?? []).map((x) => x.step_id as string);
    }
    setItems(steps);
    setDone(Object.fromEntries(marks.map((id) => [id, true])));
    setError("");
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`kidroutine:${child.id}`);
    channel.on("postgres_changes", { event: "*", schema: "public", table: "routine_step_done" }, () => load());
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  const toggle = async (s: Item) => {
    if (!canMark) return;
    setError("");
    const day = localDate();
    const was = !!done[s.id];
    setDone((d) => ({ ...d, [s.id]: !was })); // responde al instante; load() lo confirma
    if (was) {
      const { data, error } = await supabase
        .from("routine_step_done")
        .delete()
        .eq("step_id", s.id)
        .eq("day", day)
        .select("step_id");
      if (error || !data?.length) setError("No se pudo cambiar. Pide ayuda a un adulto.");
    } else {
      const { error } = await supabase.from("routine_step_done").insert({ step_id: s.id, day });
      if (error && error.code !== "23505") setError("No se pudo marcar. Pide ayuda a un adulto.");
    }
    load();
  };

  const shown = items.filter((i) => place === "todo" || i.place === "ambos" || i.place === place);
  const doneCount = shown.filter((i) => done[i.id]).length;
  const next = shown.find((i) => !done[i.id]);
  const hasPlaces = items.some((i) => i.place === "casa") && items.some((i) => i.place === "escuela");

  const chip = (active: boolean) =>
    `min-h-12 rounded-full border-2 px-6 text-lg font-semibold ${
      active ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]" : "border-[var(--border)]"
    }`;

  return (
    <div className="grid gap-5">
      <h1 className="text-4xl font-bold">Mi día</h1>

      {hasPlaces && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dónde estoy">
          {(["todo", "casa", "escuela"] as Place[]).map((p) => (
            <button key={p} type="button" onClick={() => setPlace(p)} aria-pressed={place === p} className={chip(place === p)}>
              {p === "todo" ? "Todo" : p === "casa" ? "Casa" : "Escuela"}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-lg text-[var(--muted)]">Cargando…</p>}
      {error && (
        <p role="alert" className="text-lg font-semibold text-[var(--danger)]">
          {error}
        </p>
      )}
      {!loading && shown.length === 0 && (
        <p className="rounded-3xl border-2 border-[var(--border)] p-6 text-xl">
          Hoy no hay pasos en tu rutina. 🌈
        </p>
      )}

      {shown.length > 0 && (
        <p className="text-xl font-semibold" aria-live="polite">
          {doneCount} de {shown.length}
        </p>
      )}

      {shown.length > 0 && doneCount === shown.length && (
        <p role="status" className="rounded-3xl bg-[var(--sage)] p-6 text-center text-3xl font-bold text-[var(--primary)]">
          ¡Lo lograste! 🎉
        </p>
      )}

      <ul className="grid gap-3">
        {shown.map((s) => {
          const isDone = !!done[s.id];
          const isNext = next?.id === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => toggle(s)}
                disabled={!canMark}
                aria-pressed={isDone}
                className={`flex min-h-24 w-full items-center gap-5 rounded-3xl border-4 p-5 text-left transition ${
                  isDone
                    ? "border-[var(--primary)] bg-[var(--sage)] opacity-80"
                    : isNext
                    ? "border-[var(--primary)] bg-[var(--surface)]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <span aria-hidden className="text-5xl">
                  {stepEmoji(s.title, s.emoji)}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-2xl [overflow-wrap:anywhere]">{s.title}</strong>
                  {s.at_time && <small className="text-base text-[var(--muted)]">{hhmm(s.at_time)}</small>}
                  {isNext && <small className="block text-base font-bold text-[var(--primary)]">Ahora</small>}
                </span>
                <span
                  aria-hidden
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 ${
                    isDone
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {isDone && <Check size={30} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!canMark && shown.length > 0 && (
        <p className="text-sm text-[var(--muted)]">Con tu rol solo se pueden ver los pasos.</p>
      )}
    </div>
  );
}