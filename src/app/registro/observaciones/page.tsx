"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { roleLabel } from "@/lib/roles";
import {
  CATEGORIES,
  MAX_PHOTOS,
  OBS_COLS,
  PHOTO_COLS,
  norm,
  removeObsFiles,
  sameTags,
  signedMap,
  tagLabel,
  uploadObsPhotos,
  type Category,
  type Obs,
  type Photo,
} from "@/lib/observations";
import TagPicker from "@/components/observations/TagPicker";
import PhotoPicker from "@/components/observations/PhotoPicker";
import ObsPhotos from "@/components/observations/ObsPhotos";
import VersionHistory from "@/components/observations/VersionHistory";

const LIMIT = 300;

const catStyle: Record<Category, string> = {
  Comunicación: "bg-[var(--sage)] text-[var(--primary)]",
  "Apoyos sensoriales": "bg-[var(--blue)] text-[var(--blue-text)]",
  Rutinas: "bg-[var(--sand)] text-[var(--sand-text)]",
  Disfrute: "bg-[var(--sage)] text-[var(--primary)]",
};

const field =
  "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";

export default function Observaciones() {
  const { child, userId, role } = useChild();
  const isFamily = role === "familia";

  const [obs, setObs] = useState<Obs[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [signedAt, setSignedAt] = useState(0);
  const [names, setNames] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  // Filtros
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "Todas">("Todas");
  const [tagF, setTagF] = useState("");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  // Nueva observación
  const [newCat, setNewCat] = useState<Category>("Comunicación");
  const [text, setText] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Edición
  const [editing, setEditing] = useState<string | null>(null);
  const [eCat, setECat] = useState<Category>("Comunicación");
  const [eText, setEText] = useState("");
  const [eTags, setETags] = useState<string[]>([]);
  const [eFiles, setEFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [o, p, mem, prof] = await Promise.all([
      supabase
        .from("observations")
        .select(OBS_COLS)
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase.from("observation_photos").select(PHOTO_COLS).eq("child_id", child.id),
      supabase.from("child_members").select("user_id,role").eq("child_id", child.id),
      supabase.from("profiles").select("id,full_name"),
    ]);
    if (o.error || p.error || mem.error || prof.error) {
      setError("No se pudieron cargar las observaciones.");
      setLoading(false);
      return;
    }
    const list = (o.data as Obs[]).map((x) => ({ ...x, tags: x.tags ?? [] }));
    const pics = p.data as Photo[];
    setError("");
    setObs(list);
    setPhotos(pics);
    setRoles(Object.fromEntries(mem.data.map((m) => [m.user_id, m.role])));
    setNames(Object.fromEntries(prof.data.map((x) => [x.id, x.full_name])));
    setUrls(await signedMap(pics.map((x) => x.thumb_path)));
    setSignedAt(Date.now());
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Los enlaces de las miniaturas duran 10 minutos: se renuevan al volver a la pestaña
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - signedAt > 8 * 60 * 1000) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [signedAt, load]);

  const byObs = useMemo(() => {
    const m: Record<string, Photo[]> = {};
    for (const x of photos) (m[x.observation_id] ??= []).push(x);
    return m;
  }, [photos]);

  const nameOf = (id: string) => names[id] || "Alguien del equipo";
  const authorLabel = (id: string) => {
    const r = roleLabel[roles[id]];
    return r ? `${nameOf(id)} · ${r}` : nameOf(id);
  };

  const usedTags = useMemo(() => Array.from(new Set(obs.flatMap((o) => o.tags))).sort(), [obs]);

  const visible = obs.filter(
    (o) =>
      (cat === "Todas" || o.category === cat) &&
      (!tagF || o.tags.includes(tagF)) &&
      (!onlyPhotos || (byObs[o.id]?.length ?? 0) > 0) &&
      (!q.trim() || norm(`${o.body} ${o.tags.join(" ")}`).includes(norm(q)))
  );

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    setError("");
    setNote("");
    const { data, error } = await supabase
      .from("observations")
      .insert({ child_id: child.id, category: newCat, body, tags: newTags })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      setError("No se pudo publicar la observación. Intenta de nuevo.");
      return;
    }
    const failed = newFiles.length ? await uploadObsPhotos(child.id, data.id as string, newFiles) : 0;
    setSaving(false);
    setText("");
    setNewTags([]);
    setNewFiles([]);
    if (failed) {
      setNote(
        `La observación se publicó, pero ${failed} ${failed === 1 ? "foto no se pudo subir" : "fotos no se pudieron subir"}. Puedes añadirla de nuevo al editar.`
      );
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
    load();
  };

  const startEdit = (o: Obs) => {
    setEditing(o.id);
    setECat(o.category);
    setEText(o.body);
    setETags(o.tags);
    setEFiles([]);
    setError("");
    setNote("");
  };

  const saveEdit = async (o: Obs) => {
    const body = eText.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    const changed = body !== o.body || eCat !== o.category || !sameTags(eTags, o.tags);
    if (changed) {
      const { data, error } = await supabase
        .from("observations")
        .update({ category: eCat, body, tags: eTags })
        .eq("id", o.id)
        .select("id");
      if (error || !data?.length) {
        setBusy(false);
        setError("No se pudo guardar. Solo quien escribió la observación puede editarla.");
        return;
      }
    }
    const failed = eFiles.length ? await uploadObsPhotos(child.id, o.id, eFiles) : 0;
    setBusy(false);
    setEditing(null);
    if (failed) setNote(`${failed} ${failed === 1 ? "foto no se pudo subir" : "fotos no se pudieron subir"}.`);
    load();
  };

  const remove = async (o: Obs) => {
    if (!window.confirm("¿Eliminar esta observación? También se borrarán sus fotos.")) return;
    setError("");
    const mine = byObs[o.id] ?? [];
    if (!(await removeObsFiles(mine.flatMap((x) => [x.storage_path, x.thumb_path])))) {
      setError("No se pudieron borrar las fotos. La observación no se eliminó.");
      return;
    }
    const { error } = await supabase.from("observations").delete().eq("id", o.id);
    if (error) setError("No se pudo eliminar.");
    else load();
  };

  const toggleReport = async (o: Obs) => {
    const { data, error } = await supabase
      .from("observations")
      .update({ include_in_report: !o.include_in_report })
      .eq("id", o.id)
      .select("id");
    if (error || !data?.length) setError("No se pudo cambiar la marca.");
    else load();
  };

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-xs font-semibold transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cada día nos cuenta algo</h1>
        <p className="mt-1 text-[var(--muted)]">Observaciones para descubrir qué le ayuda a {child.name}.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Observaciones compartidas</h2>

          <label className="relative mt-3 block">
            <span className="sr-only">Buscar en las observaciones</span>
            <Search size={16} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
            {(["Todas", ...CATEGORIES] as const).map((t) => (
              <button key={t} type="button" onClick={() => setCat(t)} aria-pressed={cat === t} className={chip(cat === t)}>
                {t}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {usedTags.length > 0 && (
              <label className="flex items-center gap-2 text-xs font-semibold">
                Etiqueta
                <select
                  value={tagF}
                  onChange={(e) => setTagF(e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
                >
                  <option value="">Todas</option>
                  {usedTags.map((t) => (
                    <option key={t} value={t}>
                      {tagLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={onlyPhotos}
                onChange={(e) => setOnlyPhotos(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Solo con fotos
            </label>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
          {note && (
            <p role="status" className="mt-3 text-sm text-[var(--muted)]">
              {note}
            </p>
          )}

          <ul className="mt-2 divide-y divide-[var(--border)]">
            {loading && <li className="py-6 text-sm text-[var(--muted)]">Cargando…</li>}
            {!loading && visible.length === 0 && (
              <li className="py-6 text-sm text-[var(--muted)]">
                {obs.length === 0 ? "Aún no hay observaciones. ¡Escribe la primera!" : "Ninguna observación coincide con tu búsqueda."}
              </li>
            )}

            {visible.map((o) => {
              const mine = o.author_id === userId;
              const isEditing = editing === o.id;
              const pics = byObs[o.id] ?? [];
              const room = MAX_PHOTOS - pics.length;

              return (
                <li key={o.id} className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-sm">{authorLabel(o.author_id)}</strong>
                      <small className="block text-xs text-[var(--muted)]">
                        {new Date(o.created_at).toLocaleString("es-MX", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {o.edited_at && " · editada"}
                      </small>
                    </div>
                    {mine && !isEditing && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(o)}
                          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                        >
                          <Pencil size={14} aria-hidden />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(o)}
                          className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-3 grid gap-4 rounded-xl bg-[var(--background)] p-4">
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Categoría
                        <select
                          value={eCat}
                          onChange={(e) => setECat(e.target.value as Category)}
                          className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-xs font-semibold">
                        Texto
                        <textarea
                          value={eText}
                          onChange={(e) => setEText(e.target.value)}
                          maxLength={2000}
                          rows={4}
                          className={field}
                        />
                      </label>
                      <TagPicker value={eTags} onChange={setETags} />
                      <ObsPhotos
                        photos={pics}
                        urls={urls}
                        editing
                        canDelete={(p) => p.uploaded_by === userId || isFamily}
                        onChanged={load}
                      />
                      {room > 0 && <PhotoPicker files={eFiles} onChange={setEFiles} max={room} disabled={busy} />}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => saveEdit(o)} disabled={busy || !eText.trim()} className={primary}>
                          {busy ? "Guardando…" : "Guardar cambios"}
                        </button>
                        <button type="button" onClick={() => setEditing(null)} disabled={busy} className={ghost}>
                          Cancelar
                        </button>
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        La versión anterior se guarda: la ven quien la escribió y la familia.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{o.body}</p>
                      <ObsPhotos photos={pics} urls={urls} editing={false} canDelete={() => false} onChanged={load} />
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold ${catStyle[o.category]}`}
                    >
                      {o.category}
                    </span>
                    {o.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-block rounded-md border border-[var(--border)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--muted)]"
                      >
                        {tagLabel(t)}
                      </span>
                    ))}
                  </div>

                  {o.edited_at && (isFamily || mine) && !isEditing && (
                    <VersionHistory observationId={o.id} nameOf={nameOf} />
                  )}

                  {isFamily && !isEditing && (
                    <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 text-xs">
                      <input
                        type="checkbox"
                        checked={o.include_in_report}
                        onChange={() => toggleReport(o)}
                        className="h-4 w-4 shrink-0 accent-[var(--primary)]"
                      />
                      Incluir en el informe para el pediatra
                    </label>
                  )}
                </li>
              );
            })}
          </ul>

          {obs.length >= LIMIT && (
            <p className="mt-2 text-xs text-[var(--muted)]">Se muestran las últimas {LIMIT} observaciones.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold">Añadir una observación</h2>
          <form onSubmit={publish} className="mt-4 grid gap-4">
            <label className="grid gap-1.5 text-xs font-semibold">
              Categoría
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as Category)}
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              ¿Qué notaste?
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Ej. Hoy se calmó más rápido con su música favorita."
                className={field}
              />
            </label>
            <TagPicker value={newTags} onChange={setNewTags} />
            <PhotoPicker files={newFiles} onChange={setNewFiles} max={MAX_PHOTOS} disabled={saving} />
            <div>
              <button type="submit" disabled={saving || !text.trim()} className={primary}>
                {saving ? "Publicando…" : "Publicar"}
              </button>
            </div>
            {justAdded && (
              <p role="status" className="text-sm font-medium text-[var(--primary)]">
                ✓ Observación publicada
              </p>
            )}
          </form>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Las observaciones las ve todo el equipo. Cuida no escribir datos que no quieras compartir con todos.
          </p>
        </section>
      </div>
    </div>
  );
}