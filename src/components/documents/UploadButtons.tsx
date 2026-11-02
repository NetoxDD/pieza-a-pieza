"use client";

import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { MAX_BYTES, extOf, processImage, stripExt } from "@/lib/documents";

export default function UploadButtons({
  folderId,
  onDone,
}: {
  folderId: string;
  onDone: () => void;
}) {
  const { child } = useChild();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // Devuelve un mensaje de error, o null si todo salió bien
  const uploadOne = async (file: File): Promise<string | null> => {
    try {
      let main: Blob;
      let thumb: Blob | null = null;

      if (file.type === "application/pdf") {
        if (file.size > MAX_BYTES) return "Pesa más de 10 MB.";
        main = file;
      } else if (file.type.startsWith("image/")) {
        const p = await processImage(file);
        main = p.full;
        thumb = p.thumb;
        if (main.size > MAX_BYTES) return "La imagen sigue siendo demasiado grande.";
      } else {
        return "Solo se aceptan PDF e imágenes.";
      }

      const id = crypto.randomUUID();
      const path = `${child.id}/${id}.${extOf(main.type)}`;
      const thumbPath = thumb ? `${child.id}/${id}-t.${extOf(thumb.type)}` : null;
      const bucket = supabase.storage.from("documents");

      const up = await bucket.upload(path, main, { contentType: main.type, cacheControl: "3600" });
      if (up.error) return "No se pudo subir el archivo.";

      if (thumb && thumbPath) {
        const t = await bucket.upload(thumbPath, thumb, { contentType: thumb.type });
        if (t.error) {
          await bucket.remove([path]);
          return "No se pudo subir la miniatura.";
        }
      }

      const { error } = await supabase.from("documents").insert({
        id,
        child_id: child.id,
        folder_id: folderId,
        title: stripExt(file.name).slice(0, 120) || "Documento",
        mime: main.type,
        size_bytes: main.size,
        thumb_bytes: thumb?.size ?? 0,
        storage_path: path,
        thumb_path: thumbPath,
      });

      if (error) {
        // Si no se pudo registrar, se retira el archivo para no dejarlo suelto
        await bucket.remove([path, ...(thumbPath ? [thumbPath] : [])]);
        return error.message.includes("límite")
          ? error.message
          : "No se pudo registrar el documento. Revisa tus permisos.";
      }
      return null;
    } catch {
      return "No se pudo procesar el archivo.";
    }
  };

  const handle = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    setBusy(true);
    setErrors([]);
    const errs: string[] = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`Subiendo ${i + 1} de ${files.length}…`);
      const err = await uploadOne(files[i]);
      if (err) errs.push(`${files[i].name}: ${err}`);
    }
    setBusy(false);
    setProgress("");
    setErrors(errs);
    onDone();
  };

  const btn =
    "flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={`${btn} bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]`}
        >
          <Upload size={16} aria-hidden />
          Subir archivos
        </button>
        <button
          type="button"
          onClick={() => camRef.current?.click()}
          disabled={busy}
          className={`${btn} border border-[var(--border)] text-[var(--primary)] hover:bg-[var(--sage)]`}
        >
          <Camera size={16} aria-hidden />
          Tomar foto
        </button>
      </div>

      {progress && (
        <p role="status" className="text-sm text-[var(--muted)]">
          {progress}
        </p>
      )}
      {errors.length > 0 && (
        <ul role="alert" className="grid gap-1 text-sm text-[var(--danger)]">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}