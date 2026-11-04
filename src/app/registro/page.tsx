"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import { MARK_ROLES, hhmm, isoWeekday, localDate, placeLabel, type Routine, type Step } from "@/lib/routines";

type DoneInfo = { done_by: string; done_at: string };

const TABLES = ["routines", "routine_steps", "routine_step_done", "routine_overrides", "routine_step_moves"];

export default function Hoy() {
  const { child, role, userId } = useChild();
  const { get } = useProfiles();
  const canMark = MARK_ROLES.includes(role);
  const isFamily = role === "familia";

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [done, setDone] = useState<Record<string, DoneInfo>>({});
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveValue, setMoveValue] = useState("");

  const load = useCallback(async () => {
    const day = localDate();
    const wd = isoWeekday();

    const r = await supabase
      .from("routines")
      .select("id,name,place,days,position,active")
      .eq("child_id", child.id)
      .eq("active", true)
      .order("position")
      .order("created_at");
    if (r.error) {
      setError("No se pudieron cargar las rutinas.");
      setLoading(false);
      return;
    }

    const todays = (r.data as Routine[]).filter((x) => x.days.includes(wd));
    const routineIds = todays.map((x) => x.id);

    const s = await supabase
      .from("routine_steps")
      .select("id,routine_id,title,at_time,emoji,note,position")
      .in("routine_id", routineIds)
      .order("position");
    if (s.error) {
      setError("No se pudieron cargar los pasos.");
      setLoading(false);
      return;
    }
    const stepsData = s.data as Step[];
    const stepIds = stepsData.map((x) => x.id);

    const [d, o, mv] = await Promise.all([
      supabase.from("routine_step_done").select("step_id,done_by,done_at").eq("day", day).in("step_id", stepIds),
      supabase.from("routine_overrides").select("routine_id").eq("day", day).in("routine_id", routineIds),
      supabase.from("routine_step_moves").select("step_id,at_time").eq("day", day).in("step_id", stepIds),
    ]);
    if (d.error || o.error || mv.error) {
      setError("No se pudo cargar el estado de hoy.");
      setLoading(false);
      return;
    }

    setRoutines(todays);
    setSteps(stepsData);
    setDone(
      Object.fromEntries(
        (d.data as { step_id: string; done_by: string; done_at: string }[]).map((x) => [
          x.step_id,
          { done_by: x.done_by, done_at: x.done_at },
        ])
      )
    );
    setSkipped(new Set((o.data as { routine_id: string }[]).map((x) => x.routine_id)));
    setMoves(
      Object.fromEntries((mv.data as { step_id: string; at_time: string }[]).map((x) => [x.step_id, x.at_time]))
    );
    setError("");
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  // En vivo: cuando alguien marca o cambia algo, se actualiza para todo el equipo
  useEffect(() => {
    const channel = supabase.channel(`routines:${child.id}`);
    TABLES.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => load());
    });
    channel.subscribe();
    // Respaldo: también se actualiza cada minuto (y así cambia solo al pasar la medianoche)
    const timer = setInterval(load, 60000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  const toggle = async (s: Step) => {
    setMsg("");
    const day = localDate();
    if (done[s.id]) {
      const { data, error } = await supabase
        .from("routine_step_done")
        .delete()
        .eq("step_id", s.id)
        .eq("day", day)
        .select("step_id");
      if (error || !data?.length) setMsg("No se pudo desmarcar el paso.");
    } else {
      const { error } = await supabase.from("routine_step_done").insert({ step_id: s.id, day });
      // 23505 = otra persona lo marcó un instante antes: no es un error, solo se actualiza
      if (error && error.code !== "23505") setMsg("No se pudo marcar el paso.");
    }
    load();
  };

  const skipRoutine = async (r: Routine) => {
    setMsg("");
    const { error } = await supabase.from("routine_overrides").insert({ routine_id: r.id, day: localDate() });
    if (error && error.code !== "23505") setMsg("No se pudo omitir la rutina.");
    load();
  };

  const restoreRoutine = async (r: Routine) => {
    setMsg("");
    const { error } = await supabase
      .from("routine_overrides")
      .delete()
      .eq("routine_id", r.id)
      .eq("day", localDate());
    if (error) setMsg("No se pudo restaurar la rutina.");
    load();
  };

  const saveMove = async (s: Step) => {
    if (!moveValue) return;
    setMsg("");
    const { error } = await supabase
      .from("routine_step_moves")
      .upsert({ step_id: s.id, day: localDate(), at_time: moveValue }, { onConflict: "step_id,day" });
    if (error) setMsg("No se pudo cambiar la hora.");
    else setMovingId(null);
    load();
  };

  const clearMove = async (s: Step) => {
    setMsg("");
    await supabase.from("routine_step_moves").delete().eq("step_id", s.id).eq("day", localDate());
    setMovingId(null);
    load();
  };

  const effTime = (s: Step) => moves[s.id] ?? s.at_time;
  const stepsOf = (id: string) => steps.filter((x) => x.routine_id === id);
  const firstTime = (r: Routine) =>
    stepsOf(r.id)
      .map(effTime)
      .filter((t): t is string => !!t)
      .sort()[0] ?? "99:99";
  const ordered = routines
    .slice()
    .sort((a, b) => firstTime(a).localeCompare(firstTime(b)) || a.position - b.position);

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hoy con {child.name}</h1>
        <p className="mt-1 text-[var(--muted)]">
          Una guía, no una lista de exigencias. Podemos cambiar el plan.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && !error && ordered.length === 0 && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          No hay rutinas para hoy.{" "}
          {isFamily ? (
            <Link href="/registro/rutinas" className="font-semibold text-[var(--primary)] hover:underline">
              Crear una rutina →
            </Link>
          ) : (
            "La familia puede crearlas en la pestaña Rutinas."
          )}
        </p>
      )}

      {ordered.map((r) => {
        const list = stepsOf(r.id);
        const isSkipped = skipped.has(r.id);
        const count = list.filter((s) => done[s.id]).length;
        return (
          <section key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{r.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--blue)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--blue-text)]">
                    {placeLabel[r.place]}
                  </span>
                  {!isSkipped && list.length > 0 && (
                    <small className="text-xs text-[var(--muted)]">
                      {count} de {list.length} pasos
                    </small>
                  )}
                </div>
              </div>
              {canMark && (
                <button
                  type="button"
                  onClick={() => (isSkipped ? restoreRoutine(r) : skipRoutine(r))}
                  className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                >
                  {isSkipped ? "Restaurar" : "Omitir hoy"}
                </button>
              )}
            </div>

            {isSkipped ? (
              <p className="mt-3 rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                Omitida hoy. Sin problema: mañana seguimos.
              </p>
            ) : list.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">Esta rutina aún no tiene pasos.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {list.map((s) => {
                  const d = done[s.id];
                  const who = d ? get(d.done_by)?.name ?? "alguien del equipo" : "";
                  const time = effTime(s);
                  const moved = !!moves[s.id];
                  const cannotUnmark = !!d && d.done_by !== userId && !isFamily;
                  return (
                    <li key={s.id} className="py-4">
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => toggle(s)}
                          disabled={!canMark || cannotUnmark}
                          aria-pressed={!!d}
                          aria-label={`${d ? "Desmarcar" : "Marcar como hecho"}: ${s.title}`}
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition disabled:opacity-60 ${
                            d
                              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]"
                              : "border-[var(--border)] text-transparent hover:bg-[var(--sage)]"
                          }`}
                        >
                          <Check size={18} aria-hidden />
                        </button>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`font-semibold [overflow-wrap:anywhere] ${
                              d ? "text-[var(--muted)] line-through" : ""
                            }`}
                          >
                            {s.emoji && <span aria-hidden>{s.emoji} </span>}
                            {s.title}
                          </h3>
                          <p className="text-xs text-[var(--muted)]">
                            {[time && hhmm(time) + (moved ? " (cambiada hoy)" : ""), s.note]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {d && (
                            <p className="mt-0.5 text-xs text-[var(--primary)]">
                              Hecho por {who} ·{" "}
                              {new Date(d.done_at).toLocaleTimeString("es-MX", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}

                          {canMark && !d && movingId !== s.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setMovingId(s.id);
                                setMoveValue(hhmm(time));
                              }}
                              className="mt-1 min-h-11 text-xs font-semibold text-[var(--primary)] hover:underline"
                            >
                              Mover la hora hoy
                            </button>
                          )}

                          {movingId === s.id && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <label className="sr-only" htmlFor={`mv-${s.id}`}>
                                Nueva hora para hoy
                              </label>
                              <input
                                id={`mv-${s.id}`}
                                type="time"
                                value={moveValue}
                                onChange={(e) => setMoveValue(e.target.value)}
                                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => saveMove(s)}
                                disabled={!moveValue}
                                className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
                              >
                                Guardar
                              </button>
                              {moved && (
                                <button
                                  type="button"
                                  onClick={() => clearMove(s)}
                                  className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                                >
                                  Quitar el cambio
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setMovingId(null)}
                                className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}

      {!loading && !canMark && ordered.length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          Puedes ver las rutinas, pero tu rol no marca los pasos.
        </p>
      )}

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </div>
  );
}