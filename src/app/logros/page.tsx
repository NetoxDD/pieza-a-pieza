"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import PhotoPicker from "@/components/observations/PhotoPicker";
import { localDate } from "@/lib/routines";
import {
  AREAS,
  WIN_BUCKET,
  WIN_COLS,
  areaOf,
  removeWinFiles,
  removeWinPhoto,
  signedWins,
  uploadWinPhoto,
  winError,
  type Win,
} from "@/lib/wins";

const today = () => localDate();
const daysAgo = (n: number) => {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - n));
};
const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

const inputCls =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const areaCls =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";

export default function Logros() {
  const { child, userId, role } = useChild();
  const { get } = useProfiles();
  const isFamily = role === "familia";

  const [wins, setWins] = useState<Win[]>([]);
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [area, setArea] = useState("todas");
  const [big, setBig] = useState<string | null>(null);

  // Nuevo
  const [title, setTitle] = useState("");
  const [newArea, setNewArea] = useState("otro");
  const [date, setDate] = useState(today());
  const [text, setText] = useState("");
  const [goalId, setGoalId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Edición
  const [editing, setEditing] = useState<string | null>(null);
  const [eTitle, setETitle] = useState("");
  const [eArea, setEArea] = useState("otro");
  const [eDate, setEDate] = useState(today());
  const [eText, setEText] = useState("");
  const [eGoal, setEGoal] = useState("");
  const [eFiles, setEFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const nameOf = (id: string) => get(id)?.name ?? "Alguien del equipo";

  const load = useCallback(async () => {
    const [w, g] = await Promise.all([
      supabase
        .from("achievements")
        .select(WIN_COLS)
        .eq("child_id", child.id)
        .order("achieved_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("goals").select("id,title").eq("child_id", child.id).order("created_at"),
    ]);
    if (w.error) {
      setError("No se pudieron cargar los logros.");
      setLoading(false);
      return;
    }
    setError("");
    const list = w.data as Win[];
    setWins(list);
    if (!g.error) setGoals(g.data as { id: string; title: string }[]);
    setUrls(await signedWins(list.map((x) => x.thumb_path).filter((x): x is string => !!x)));
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = wins.filter((w) => area === "todas" || w.area === area);
  const monthStart = today().slice(0, 8) + "01";
  const thisMonth = wins.filter((w) => w.achieved_on >= monthStart).length;

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    setNote("");
    const { data, error } = await supabase
      .from("achievements")
      .insert({
        child_id: child.id,
        achieved_on: date,
        area: newArea,
        title: title.trim(),
        note: text.trim() || null,
        goal_id: goalId || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      setError(winError(error));
      return;
    }
    let failedPhoto = false;
    if (files[0]) failedPhoto = !(await uploadWinPhoto(child.id, data.id as string, files[0]));
    setSaving(false);
    setTitle("");
    setText("");
    setGoalId("");
    setFiles([]);
    setDate(today());
    if (failedPhoto) setNote("El logro se guardó, pero la foto no se pudo subir. Puedes añadirla al editarlo.");
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
    load();
  };

  const startEdit = (w: Win) => {
    setEditing(w.id);
    setETitle(w.title);
    setEArea(w.area);
    setEDate(w.achieved_on);
    setEText(w.note ?? "");
    setEGoal(w.goal_id ?? "");
    setEFiles([]);
    setError("");
    setNote("");
  };

  const saveEdit = async (w: Win) => {
    if (!eTitle.trim()) return;
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("achievements")
      .update({
        title: eTitle.trim(),
        area: eArea,
        achieved_on: eDate,
        note: eText.trim() || null,
        goal_id: eGoal || null,
      })
      .eq("id", w.id)
      .select("id");
    if (error || !data?.length) {
      setBusy(false);
      setError(error ? winError(error) : "Solo quien lo anotó puede editarlo.");
      return;
    }
    if (eFiles[0] && !w.photo_path) {
      if (!(await uploadWinPhoto(child.id, w.id, eFiles[0]))) setNote("Los cambios se guardaron, pero la foto no se pudo subir.");
    }
    setBusy(false);
    setEditing(null);
    load();
  };

  const dropPhoto = async (w: Win) => {
    if (!window.confirm("¿Quitar la foto de este logro?")) return;
    if (await removeWinPhoto(w)) load();
    else setError("No se pudo quitar la foto.");
  };

  const remove = async (w: Win) => {
    if (!window.confirm("¿Quitar este logro? También se borrará su foto.")) return;
    setError("");
    if (!(await removeWinFiles(w))) {
      setError("No se pudo borrar la foto. El logro no se eliminó.");
      return;
    }
    const { error } = await supabase.from("achievements").delete().eq("id", w.id);
    if (error) setError("No se pudo quitar el logro.");
    else load();
  };

  const toggleChild = async (w: Win) => {
    const { data, error } = await supabase
      .from("achievements")
      .update({ show_to_child: !w.show_to_child })
      .eq("id", w.id)
      .select("id");
    if (error || !data?.length) setError("No se pudo cambiar. Solo la familia lo decide.");
    else load();
  };

  const openBig = async (w: Win) => {
    if (!w.photo_path) return;
    const { data } = await supabase.storage.from(WIN_BUCKET).createSignedUrl(w.photo_path, 300);
    if (data?.signedUrl) setBig(data.signedUrl);
    else setError("No se pudo abrir la foto.");
  };

  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setBig(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [big]);

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  const areaSelect = (value: string, set: (v: string) => void) => (
    <label className="grid gap-1.5 text-xs font-semibold">
      Área
      <select value={value} onChange={(e) => set(e.target.value)} className={inputCls}>
        {AREAS.map((a) => (
          <option key={a.key} value={a.key}>
            {a.label}
          </option>
        ))}
      </select>
    </label>
  );

  const goalSelect = (value: string, set: (v: string) => void) =>
    goals.length > 0 ? (
      <label className="grid gap-1.5 text-xs font-semibold">
        Objetivo relacionado (opcional)
        <select value={value} onChange={(e) => set(e.target.value)} className={inputCls}>
          <option value="">Ninguno</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Muro de logros</h1>
        <p className="mt-1 text-[var(--muted)]">
          Los avances y los momentos buenos de {child.name}, por pequeños que sean.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Anotar un logro</h2>
        <form onSubmit={publish} className="mt-4 grid gap-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            ¿Qué logró?
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              placeholder="Ej. Se puso los zapatos solo"
              className={inputCls}
            />
          </label>
          <div className="flex flex-wrap items-end gap-4">
            {areaSelect(newArea, setNewArea)}
            <label className="grid gap-1.5 text-xs font-semibold">
              Fecha
              <input
                type="date"
                value={date}
                min={daysAgo(365)}
                max={today()}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs font-semibold">
            Nota (opcional)
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={300} rows={2} className={areaCls} />
          </label>
          {goalSelect(goalId, setGoalId)}
          <PhotoPicker files={files} onChange={setFiles} max={1} disabled={saving} />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving || !title.trim()} className={primary}>
              {saving ? "Guardando…" : "Añadir al muro"}
            </button>
            {justAdded && (
              <span role="status" className="text-sm font-medium text-[var(--primary)]">
                ✓ ¡Anotado!
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por área">
          <button type="button" onClick={() => setArea("todas")} aria-pressed={area === "todas"} className={chip(area === "todas")}>
            Todas
          </button>
          {AREAS.map((a) => (
            <button key={a.key} type="button" onClick={() => setArea(a.key)} aria-pressed={area === a.key} className={chip(area === a.key)}>
              {a.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-sm text-[var(--muted)]" aria-live="polite">
          {loading ? "Cargando…" : `${thisMonth} ${thisMonth === 1 ? "logro" : "logros"} este mes · ${wins.length} en total`}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="mt-2 text-sm text-[var(--muted)]">
            {note}
          </p>
        )}

        <ul className="mt-2 divide-y divide-[var(--border)]">
          {!loading && shown.length === 0 && (
            <li className="py-6 text-sm text-[var(--muted)]">
              {wins.length === 0 ? "Todavía no hay logros. ¡Anota el primero!" : "No hay logros en esta área."}
            </li>
          )}

          {shown.map((w) => {
            const a = areaOf(w.area);
            const mine = w.author_id === userId;
            const goal = goals.find((g) => g.id === w.goal_id);
            const isEditing = editing === w.id;

            return (
              <li key={w.id} className="py-5">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-3xl">
                    {a.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="grid gap-4 rounded-xl bg-[var(--background)] p-4">
                        <label className="grid gap-1.5 text-xs font-semibold">
                          Título
                          <input value={eTitle} onChange={(e) => setETitle(e.target.value)} maxLength={100} className={inputCls} />
                        </label>
                        <div className="flex flex-wrap items-end gap-4">
                          {areaSelect(eArea, setEArea)}
                          <label className="grid gap-1.5 text-xs font-semibold">
                            Fecha
                            <input
                              type="date"
                              value={eDate}
                              min={daysAgo(365)}
                              max={today()}
                              onChange={(e) => e.target.value && setEDate(e.target.value)}
                              className={inputCls}
                            />
                          </label>
                        </div>
                        <label className="grid gap-1.5 text-xs font-semibold">
                          Nota
                          <textarea value={eText} onChange={(e) => setEText(e.target.value)} maxLength={300} rows={2} className={areaCls} />
                        </label>
                        {goalSelect(eGoal, setEGoal)}
                        {w.photo_path ? (
                          <button type="button" onClick={() => dropPhoto(w)} className={ghost}>
                            Quitar la foto
                          </button>
                        ) : (
                          <PhotoPicker files={eFiles} onChange={setEFiles} max={1} disabled={busy} />
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => saveEdit(w)} disabled={busy || !eTitle.trim()} className={primary}>
                            {busy ? "Guardando…" : "Guardar cambios"}
                          </button>
                          <button type="button" onClick={() => setEditing(null)} disabled={busy} className={ghost}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-base font-semibold [overflow-wrap:anywhere]">{w.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {a.label} · {fmt(w.achieved_on)} · {nameOf(w.author_id)}
                        </p>
                        {w.note && <p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{w.note}</p>}
                        {goal && <p className="mt-2 text-xs text-[var(--muted)]">Objetivo: {goal.title}</p>}
                        {w.thumb_path && (
                          <button
                            type="button"
                            onClick={() => openBig(w)}
                            aria-label={`Ampliar la foto de: ${w.title}`}
                            className="mt-3 block"
                          >
                            {urls[w.thumb_path] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={urls[w.thumb_path]}
                                alt={`Foto de: ${w.title}`}
                                className="h-28 w-28 rounded-lg object-cover"
                              />
                            ) : (
                              <span className="grid h-28 w-28 place-items-center rounded-lg bg-[var(--sage)] text-xs text-[var(--muted)]">
                                Foto
                              </span>
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {!isEditing && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {isFamily && (
                          <label className="flex min-h-11 cursor-pointer items-center gap-2 pr-3 text-xs">
                            <input
                              type="checkbox"
                              checked={w.show_to_child}
                              onChange={() => toggleChild(w)}
                              className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                            />
                            Mostrar al niño en su zona
                          </label>
                        )}
                        {mine && (
                          <button
                            type="button"
                            onClick={() => startEdit(w)}
                            className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                          >
                            Editar
                          </button>
                        )}
                        {(mine || isFamily) && (
                          <button
                            type="button"
                            onClick={() => remove(w)}
                            className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        {wins.length >= 200 && <p className="mt-2 text-xs text-[var(--muted)]">Se muestran los últimos 200 logros.</p>}
      </section>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Los logros los ve todo el equipo. La familia decide cuáles ve el niño en su zona. Cuida no escribir datos
        que no quieras compartir con todos.
      </div>

      {big && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada"
          className="fixed inset-0 z-[80] grid place-items-center bg-black/80 p-4"
          onClick={() => setBig(null)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setBig(null)}
            className="absolute right-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--surface)] px-4 text-sm font-semibold"
          >
            <X size={16} aria-hidden />
            Cerrar
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="Foto del logro" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}