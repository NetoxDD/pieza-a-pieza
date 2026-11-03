"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { expiryLabel, expiryOf, formatBytes, type Doc, type Folder } from "@/lib/documents";
import { formatDate } from "@/lib/ficha";


const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function DocumentItem({
  doc,
  thumbUrl,
  folderName,
  uploaderName,
  canManage,
  moveTargets,
  onOpen,
  onChanged,
}: {
  doc: Doc;
  thumbUrl?: string;
  folderName?: string;
  uploaderName: string;
  canManage: boolean;
  moveTargets: Folder[];
  onOpen: (d: Doc) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", valid: "", notes: "", folder: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

const exp = expiryOf(doc.valid_until);

  const startEdit = () => {
    setForm({
      title: doc.title,
      date: doc.document_date ?? "",
      valid: doc.valid_until ?? "",
      notes: doc.notes ?? "",
      folder: doc.folder_id,
    });
    setMsg("");
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase
      .from("documents")
      .update({
        title,
        document_date: form.date || null,
        valid_until: form.valid || null,
        notes: form.notes.trim() || null,
        folder_id: form.folder,
      })
      .eq("id", doc.id)
      .select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar "${doc.title}"? No se puede deshacer.`)) return;
    setBusy(true);
    // Primero se quita el registro (así se corta el acceso al instante) y después el archivo
    const { data, error } = await supabase.from("documents").delete().eq("id", doc.id).select("id");
    if (error || !data?.length) {
      setBusy(false);
      setMsg("No se pudo eliminar.");
      return;
    }
    const paths = [doc.storage_path, ...(doc.thumb_path ? [doc.thumb_path] : [])];
    await supabase.storage.from("documents").remove(paths);
    setBusy(false);
    onChanged();
  };

  return (
    <li className="py-4">
      <div className="flex items-start gap-4">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-[var(--sage)] text-[var(--primary)]">
            <FileText size={26} aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <strong className="block [overflow-wrap:anywhere]">{doc.title}</strong>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {[
              folderName,
              doc.mime === "application/pdf" ? "PDF" : "Imagen",
              formatBytes(doc.size_bytes),
              doc.document_date && `Fecha: ${formatDate(doc.document_date)}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
{doc.valid_until && (
  <p
    className={`mt-0.5 text-xs font-semibold ${
      exp.state === "expired" || exp.state === "soon" ? "text-[var(--danger)]" : "text-[var(--muted)]"
    }`}
  >
    {exp.state === "ok" ? "Vigente hasta el " : "Vigencia: "}
    {formatDate(doc.valid_until)}
    {(exp.state === "soon" || exp.state === "expired") && ` · ${expiryLabel(exp)}`}
  </p>
)}
          {doc.notes && <p className="mt-1 text-sm [overflow-wrap:anywhere]">{doc.notes}</p>}
          <small className="mt-1 block text-xs text-[var(--muted)]">
            Subido por {uploaderName} el{" "}
            {new Date(doc.created_at).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </small>

          <div className="mt-2 flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onOpen(doc)}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
            >
              Abrir
            </button>
            {canManage && !editing && (
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={busy}
                  className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <form onSubmit={save} className="mt-3 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Título
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
              required
              className={input}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Fecha del documento (opcional)
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={input}
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              Vigencia hasta (opcional)
              <input
                type="date"
                value={form.valid}
                onChange={(e) => setForm({ ...form, valid: e.target.value })}
                className={input}
              />
            </label>
          </div>
          {moveTargets.length > 1 && (
            <label className="grid gap-1.5 text-xs font-semibold">
              Carpeta
              <select
                value={form.folder}
                onChange={(e) => setForm({ ...form, folder: e.target.value })}
                className={input}
              >
                {moveTargets.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid gap-1.5 text-xs font-semibold">
            Notas (opcional)
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={200}
              className={input}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !form.title.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {msg && (
        <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </li>
  );
}   