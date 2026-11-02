"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { MAX_BYTES, extOf, processImage } from "@/lib/documents";
import { CATEGORIES, kindLabel, normalizeUrl, type MaterialKind } from "@/lib/material";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const area = "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";

export default function PublishForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const { child } = useChild();
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<MaterialKind>("actividad");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("rutinas");
  const [audience, setAudience] = useState<"todos" | "familia">("todos");
  const [url, setUrl] = useState("");
  const [steps, setSteps] = useState("");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setError("");
    setBusy(true);

    const row: Record<string, unknown> = {
      child_id: child.id,
      kind,
      title: t,
      description: description.trim() || null,
      category,
      audience,
    };
    const uploaded: string[] = [];

    try {
      if (kind === "enlace") {
        const u = normalizeUrl(url);
        if (!u) throw new Error("Escribe una dirección web válida que empiece con https://");
        row.url = u;
      } else if (kind === "actividad") {
        if (!steps.trim()) throw new Error("Escribe los pasos de la actividad.");
        row.steps = steps.trim();
        row.duration_min = duration ? Number(duration) : null;
      } else {
        if (!file) throw new Error("Elige un archivo.");
        let main: Blob;
        let thumb: Blob | null = null;
        if (file.type === "application/pdf") {
          if (file.size > MAX_BYTES) throw new Error("El PDF pesa más de 10 MB.");
          main = file;
        } else if (file.type.startsWith("image/")) {
          const p = await processImage(file);
          main = p.full;
          thumb = p.thumb;
        } else {
          throw new Error("Solo se aceptan PDF e imágenes.");
        }

        const id = crypto.randomUUID();
        const path = `${child.id}/${id}.${extOf(main.type)}`;
        const bucket = supabase.storage.from("materials");

        const up = await bucket.upload(path, main, { contentType: main.type, cacheControl: "3600" });
        if (up.error) throw new Error("No se pudo subir el archivo.");
        uploaded.push(path);

        let thumbPath: string | null = null;
        if (thumb) {
          thumbPath = `${child.id}/${id}-t.${extOf(thumb.type)}`;
          const tu = await bucket.upload(thumbPath, thumb, { contentType: thumb.type });
          if (tu.error) throw new Error("No se pudo subir la miniatura.");
          uploaded.push(thumbPath);
        }

        Object.assign(row, {
          id,
          mime: main.type,
          size_bytes: main.size,
          thumb_bytes: thumb?.size ?? 0,
          storage_path: path,
          thumb_path: thumbPath,
        });
      }

      const { error: insertError } = await supabase.from("materials").insert(row);
      if (insertError) {
        throw new Error(
          insertError.message.includes("límite")
            ? insertError.message
            : "No se pudo publicar. Revisa tus permisos."
        );
      }
      onDone();
    } catch (err) {
      // Si algo falló, no se deja ningún archivo suelto
      if (uploaded.length > 0) await supabase.storage.from("materials").remove(uploaded);
      setError(err instanceof Error ? err.message : "No se pudo publicar.");
    }
    setBusy(false);
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <h2 className="text-lg font-semibold">Nueva publicación</h2>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">¿Qué quieres compartir?</legend>
        <div className="flex flex-wrap gap-2">
          {(["actividad", "enlace", "archivo"] as const).map((k) => (
            <label
              key={k}
              className={`flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm transition has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--blue-text)] ${
                kind === k
                  ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
                  : "border-[var(--border)] hover:bg-[var(--sage)]"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {kindLabel[k]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-1.5 text-xs font-semibold">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          className={input}
        />
      </label>

      <label className="grid gap-1.5 text-xs font-semibold">
        Descripción (opcional)
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={600}
          rows={3}
          className={area}
        />
      </label>

      {kind === "enlace" && (
        <label className="grid gap-1.5 text-xs font-semibold">
          Dirección web
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            maxLength={500}
            placeholder="https://…"
            inputMode="url"
            className={input}
          />
        </label>
      )}

      {kind === "actividad" && (
        <>
          <label className="grid gap-1.5 text-xs font-semibold">
            Pasos (uno por línea)
            <textarea
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              maxLength={1500}
              rows={5}
              placeholder={"Mostrar dos cuentos\nEsperar a que elija\nLeerlo juntos"}
              className={area}
            />
          </label>
          <label className="grid max-w-40 gap-1.5 text-xs font-semibold">
            Duración en minutos (opcional)
            <input
              type="number"
              min={1}
              max={120}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={input}
            />
          </label>
        </>
      )}

      {kind === "archivo" && (
        <div className="grid gap-1.5">
          <span className="text-xs font-semibold">Archivo (PDF o imagen, hasta 10 MB)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
            >
              {file ? "Cambiar archivo" : "Elegir archivo"}
            </button>
            {file && <span className="text-sm [overflow-wrap:anywhere]">{file.name}</span>}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-semibold">
          Categoría
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold">
          ¿Quién puede verlo?
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as "todos" | "familia")}
            className={input}
          >
            <option value="todos">Todo el equipo</option>
            <option value="familia">Solo la familia</option>
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}