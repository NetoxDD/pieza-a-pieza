"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { formatBytes } from "@/lib/documents";

type Bucket = "documents" | "materials";
type Orphan = { bucket: Bucket; path: string; size: number };

async function listAll(bucket: Bucket, folder: string) {
  const out: { name: string; created: number; size: number }[] = [];
  const PAGE = 1000;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: PAGE, offset });
    if (error) throw error;
    (data ?? []).forEach((f) =>
      out.push({
        name: f.name,
        created: f.created_at ? new Date(f.created_at).getTime() : 0,
        size: Number((f.metadata as { size?: number } | null)?.size ?? 0),
      })
    );
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export default function OrphanCleaner() {
  const { child } = useChild();
  const [busy, setBusy] = useState(false);
  const [orphans, setOrphans] = useState<Orphan[] | null>(null);
  const [includeRecent, setIncludeRecent] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  const scan = async () => {
    setBusy(true);
    setMsg("");
    setOk(false);
    setOrphans(null);
    try {
      const [d, m] = await Promise.all([
        supabase.from("documents").select("storage_path,thumb_path").eq("child_id", child.id),
        supabase.from("materials").select("storage_path,thumb_path").eq("child_id", child.id),
      ]);
      if (d.error || m.error) throw new Error("db");

      const known: Record<Bucket, Set<string>> = { documents: new Set(), materials: new Set() };
      d.data.forEach((r) => {
        if (r.storage_path) known.documents.add(r.storage_path);
        if (r.thumb_path) known.documents.add(r.thumb_path);
      });
      m.data.forEach((r) => {
        if (r.storage_path) known.materials.add(r.storage_path);
        if (r.thumb_path) known.materials.add(r.thumb_path);
      });

      // Los archivos de la última hora se respetan: pueden estar subiéndose en este momento
      const cutoff = includeRecent ? Date.now() + 1000 : Date.now() - 60 * 60 * 1000;
      const found: Orphan[] = [];
      for (const bucket of ["documents", "materials"] as const) {
        const files = await listAll(bucket, child.id);
        files.forEach((f) => {
          if (f.name.startsWith(".")) return; // marcadores internos
          const path = `${child.id}/${f.name}`;
          if (known[bucket].has(path)) return;
          if (f.created > cutoff) return;
          found.push({ bucket, path, size: f.size });
        });
      }
      setOrphans(found);
    } catch {
      setMsg("No se pudo revisar el almacenamiento. Intenta de nuevo.");
    }
    setBusy(false);
  };

  const clean = async () => {
    if (!orphans || orphans.length === 0) return;
    if (!window.confirm(`¿Eliminar ${orphans.length} archivos sueltos? No se puede deshacer.`)) return;
    setBusy(true);
    setMsg("");
    let removed = 0;
    for (const bucket of ["documents", "materials"] as const) {
      const paths = orphans.filter((o) => o.bucket === bucket).map((o) => o.path);
      if (paths.length === 0) continue;
      const { data, error } = await supabase.storage.from(bucket).remove(paths);
      if (!error) removed += data?.length ?? 0;
    }
    setBusy(false);
    setOrphans(null);
    setOk(removed > 0);
    setMsg(
      removed > 0
        ? `✓ Se eliminaron ${removed} archivos sueltos.`
        : "No se pudo eliminar ningún archivo."
    );
  };

  const total = orphans ? orphans.reduce((s, o) => s + o.size, 0) : 0;

  return (
    <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div>
        <h2 className="text-lg font-semibold">Mantenimiento: archivos sueltos</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Si una subida se corta a medias, puede quedar un archivo en el almacén sin documento
          asociado. Ocupa espacio real, aunque no cuente en tu límite. Aquí puedes encontrarlos y
          eliminarlos.
        </p>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={includeRecent}
          onChange={(e) => setIncludeRecent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
        />
        <span>
          Incluir archivos de la última hora
          <small className="block text-xs text-[var(--muted)]">
            Por defecto se respetan, porque podrían estar subiéndose en este momento.
          </small>
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={scan}
          disabled={busy}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60"
        >
          {busy ? "Revisando…" : "Buscar archivos sueltos"}
        </button>
        {orphans && orphans.length > 0 && (
          <button
            type="button"
            onClick={clean}
            disabled={busy}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            Eliminar {orphans.length} {orphans.length === 1 ? "archivo" : "archivos"} ({formatBytes(total)})
          </button>
        )}
      </div>

      {orphans && orphans.length === 0 && (
        <p role="status" className="text-sm text-[var(--primary)]">
          ✓ No hay archivos sueltos.
        </p>
      )}
      {msg && (
        <p
          role={ok ? "status" : "alert"}
          className={`text-sm ${ok ? "font-medium text-[var(--primary)]" : "text-[var(--danger)]"}`}
        >
          {msg}
        </p>
      )}
    </section>
  );
}