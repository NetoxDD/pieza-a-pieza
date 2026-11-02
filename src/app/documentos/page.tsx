"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { useProfiles } from "@/components/ProfilesProvider";
import ConsentCard from "@/components/ficha/ConsentCard";
import UploadButtons from "@/components/documents/UploadButtons";
import DocumentItem from "@/components/documents/DocumentItem";
import FolderAccessPanel from "@/components/documents/FolderAccessPanel";
import { formatBytes, type Doc, type Folder } from "@/lib/documents";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]";

export default function Documentos() {
  const { child, userId } = useChild();
  const { canEdit, consented, editable } = useChildProfile();
  const { get } = useProfiles();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [rights, setRights] = useState<Record<string, boolean>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [readyUrl, setReadyUrl] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [showAccess, setShowAccess] = useState(false);

  const load = useCallback(async () => {
    const [f, d, r] = await Promise.all([
      supabase.from("document_folders").select("id,name").eq("child_id", child.id).order("created_at"),
      supabase
        .from("documents")
        .select(
          "id,folder_id,title,mime,size_bytes,thumb_bytes,storage_path,thumb_path,document_date,valid_until,notes,uploaded_by,created_at"
        )
        .eq("child_id", child.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("my_folder_rights", { cid: child.id }),
    ]);

    if (f.error || d.error || r.error) {
      setError("No se pudieron cargar los documentos.");
      setLoading(false);
      return;
    }

    const docsData = d.data as Doc[];
    setFolders(f.data as Folder[]);
    setDocs(docsData);
    setRights(
      Object.fromEntries(
        (r.data as { folder_id: string; can_upload: boolean }[]).map((x) => [x.folder_id, x.can_upload])
      )
    );

    // Enlaces temporales para las miniaturas
    const paths = docsData.map((x) => x.thumb_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      const { data } = await supabase.storage.from("documents").createSignedUrls(paths, 3600);
      const map: Record<string, string> = {};
      data?.forEach((x) => {
        if (x.path && x.signedUrl) map[x.path] = x.signedUrl;
      });
      setThumbs(map);
    } else {
      setThumbs({});
    }

    if (canEdit) {
      const u = await supabase.rpc("storage_usage", { cid: child.id });
      if (!u.error) setUsage(u.data as { used: number; quota: number });
    }

    setError("");
    setLoading(false);
  }, [child.id, canEdit]);

  useEffect(() => {
    load();
  }, [load]);

  // La primera vez, la familia recibe las carpetas iniciales
  const triedDefaults = useRef(false);
  useEffect(() => {
    if (loading || triedDefaults.current) return;
    if (editable && folders.length === 0) {
      triedDefaults.current = true;
      supabase.rpc("ensure_default_folders", { cid: child.id }).then(() => load());
    }
  }, [loading, editable, folders.length, child.id, load]);

  // Mantiene una carpeta seleccionada
  useEffect(() => {
    if (folders.length === 0) {
      setFolderId(null);
    } else if (!folderId || !folders.some((f) => f.id === folderId)) {
      setFolderId(folders[0].id);
    }
  }, [folders, folderId]);

  const current = folders.find((f) => f.id === folderId) ?? null;
  const search = q.trim().toLowerCase();
  const shown = search
    ? docs.filter((x) => x.title.toLowerCase().includes(search))
    : docs.filter((x) => x.folder_id === folderId);
  const folderName = (id: string) => folders.find((f) => f.id === id)?.name;
  const count = (id: string) => docs.filter((x) => x.folder_id === id).length;
  const moveTargets = folders.filter((f) => rights[f.id]);
  const uploadable = !!folderId && !!rights[folderId];
  const pct = usage ? Math.min(100, Math.round((usage.used / usage.quota) * 100)) : 0;

  const openDoc = async (d: Doc) => {
    setMsg("");
    setReadyUrl("");
    // El registro de apertura se intenta antes de generar el enlace (si falla, no impide abrir)
    await supabase.rpc("log_document_access", { did: d.id, act: "abierto" });
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(d.storage_path, 300);
    if (error || !data) {
      setMsg("No se pudo abrir el documento.");
      return;
    }
    const w = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    // Si el navegador bloqueó la ventana, se ofrece un enlace
    if (!w) setReadyUrl(data.signedUrl);
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setMsg("");
    const { data, error } = await supabase
      .from("document_folders")
      .insert({ child_id: child.id, name })
      .select("id")
      .single();
    if (error) {
      setMsg(error.code === "23505" ? "Ya existe una carpeta con ese nombre." : "No se pudo crear la carpeta.");
      return;
    }
    setNewName("");
    setShowNew(false);
    await load();
    setFolderId(data.id);
  };

  const renameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = renameValue.trim();
    if (!name || !current) return;
    setMsg("");
    const { data, error } = await supabase
      .from("document_folders")
      .update({ name })
      .eq("id", current.id)
      .select("id");
    if (error || !data?.length) {
      setMsg(error?.code === "23505" ? "Ya existe una carpeta con ese nombre." : "No se pudo renombrar.");
      return;
    }
    setRenaming(false);
    load();
  };

  const deleteFolder = async () => {
    if (!current) return;
    const inside = docs.filter((x) => x.folder_id === current.id);
    const ok = window.confirm(
      inside.length > 0
        ? `¿Eliminar la carpeta «${current.name}» y sus ${inside.length} documentos? No se puede deshacer.`
        : `¿Eliminar la carpeta «${current.name}»?`
    );
    if (!ok) return;
    setMsg("");
    const paths = inside.flatMap((x) => [x.storage_path, ...(x.thumb_path ? [x.thumb_path] : [])]);
    // Primero se borran los registros (se corta el acceso) y luego los archivos
    const { data, error } = await supabase
      .from("document_folders")
      .delete()
      .eq("id", current.id)
      .select("id");
    if (error || !data?.length) {
      setMsg("No se pudo eliminar la carpeta.");
      return;
    }
    if (paths.length > 0) await supabase.storage.from("documents").remove(paths);
    setShowAccess(false);
    load();
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="mt-1 text-[var(--muted)]">
          Recetas, estudios e informes de {child.name}, en carpetas y con permisos.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && canEdit && !consented && <ConsentCard />}

      {!loading && folders.length === 0 && !(canEdit && !consented) && (
        <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          {canEdit
            ? "Preparando tus carpetas…"
            : "La familia aún no ha compartido ninguna carpeta contigo."}
        </p>
      )}

      {!loading && folders.length > 0 && (
        <>
          {canEdit && usage && (
            <section className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <strong>Almacenamiento</strong>
                <span className="text-[var(--muted)]">
                  {formatBytes(usage.used)} de {formatBytes(usage.quota)}
                </span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-[var(--sage)]"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Almacenamiento usado"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 90 ? "var(--danger)" : "var(--primary)",
                  }}
                />
              </div>
            </section>
          )}

          <label className="grid gap-1.5 text-xs font-semibold">
            Buscar por título
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej. receta, análisis…"
              className={input}
            />
          </label>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Carpetas">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFolderId(f.id);
                  setQ("");
                  setRenaming(false);
                  setShowAccess(false);
                  setReadyUrl("");
                }}
                aria-pressed={!search && f.id === folderId}
                className={`min-h-11 rounded-full border px-4 text-sm transition ${
                  !search && f.id === folderId
                    ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                    : "border-[var(--border)] hover:bg-[var(--sage)]"
                }`}
              >
                {f.name} <span className="text-xs text-[var(--muted)]">({count(f.id)})</span>
              </button>
            ))}
            {editable && (
              <button type="button" onClick={() => setShowNew((s) => !s)} className={`${ghost} rounded-full`}>
                + Nueva carpeta
              </button>
            )}
          </div>

          {showNew && (
            <form onSubmit={createFolder} className="flex flex-wrap items-end gap-2">
              <label className="grid flex-1 gap-1.5 text-xs font-semibold">
                Nombre de la carpeta
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={60}
                  required
                  className={input}
                />
              </label>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
              >
                Crear
              </button>
            </form>
          )}

          {current && !search && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {renaming ? (
                  <form onSubmit={renameFolder} className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      maxLength={60}
                      required
                      aria-label="Nuevo nombre de la carpeta"
                      className={`${input} flex-1`}
                    />
                    <button
                      type="submit"
                      className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)]"
                    >
                      Guardar
                    </button>
                    <button type="button" onClick={() => setRenaming(false)} className={ghost}>
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{current.name}</h2>
                )}

                {canEdit && !renaming && (
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRenameValue(current.name);
                        setRenaming(true);
                      }}
                      className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                    >
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAccess((s) => !s)}
                      aria-expanded={showAccess}
                      className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                    >
                      Permisos
                    </button>
                    <button
                      type="button"
                      onClick={deleteFolder}
                      className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>

              {showAccess && canEdit && (
                <div className="mt-4">
                  <FolderAccessPanel folder={current} />
                </div>
              )}

              {uploadable && (
                <div className="mt-4">
                  <UploadButtons folderId={current.id} onDone={load} />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    PDF o imágenes de hasta 10 MB. Las imágenes se reducen y pierden sus datos ocultos;
                    los PDF se suben tal cual y pueden conservar los suyos.
                  </p>
                </div>
              )}
            </section>
          )}

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            {search && (
              <h2 className="text-lg font-semibold">
                Resultados para «{q.trim()}» ({shown.length})
              </h2>
            )}
            {shown.length === 0 ? (
              <p className="rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                {search ? "No hay documentos con ese título." : "Esta carpeta está vacía."}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {shown.map((d) => (
                  <DocumentItem
                    key={d.id}
                    doc={d}
                    thumbUrl={d.thumb_path ? thumbs[d.thumb_path] : undefined}
                    folderName={search ? folderName(d.folder_id) : undefined}
                    uploaderName={get(d.uploaded_by)?.name ?? "alguien del equipo"}
                    canManage={canEdit || d.uploaded_by === userId}
                    moveTargets={moveTargets}
                    onOpen={openDoc}
                    onChanged={load}
                  />
                ))}
              </ul>
            )}
          </section>

          {readyUrl && (
            <p role="status" className="rounded-xl bg-[var(--blue)] p-4 text-sm">
              Tu navegador bloqueó la ventana nueva.{" "}
              <a href={readyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                Abrir el documento
              </a>{" "}
              (el enlace dura 5 minutos).
            </p>
          )}
        </>
      )}

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Proyecto escolar: usa documentos de ejemplo, no información real de un menor. Evita subir
        documentos de identidad.
      </div>
    </div>
  );
}