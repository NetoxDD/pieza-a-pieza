"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BUCKET, removeObsPhoto, type Photo } from "@/lib/observations";

export default function ObsPhotos({
  photos,
  urls,
  canDelete,
  editing,
  onChanged,
}: {
  photos: Photo[];
  urls: Record<string, string>;
  canDelete: (p: Photo) => boolean;
  editing: boolean;
  onChanged: () => void;
}) {
  const [big, setBig] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!big) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBig(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [big]);

  if (photos.length === 0) return null;

  const open = async (p: Photo) => {
    setError("");
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.storage_path, 300);
    if (data?.signedUrl) setBig(data.signedUrl);
    else setError("No se pudo abrir la foto.");
  };

  const remove = async (p: Photo) => {
    if (!window.confirm("¿Quitar esta foto?")) return;
    setError("");
    if (await removeObsPhoto(p)) onChanged();
    else setError("No se pudo quitar la foto.");
  };

  return (
    <div className="mt-3">
      <ul className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <li key={p.id} className="relative">
            <button type="button" onClick={() => open(p)} aria-label={`Ampliar la foto ${i + 1} de ${photos.length}`}>
              {urls[p.thumb_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={urls[p.thumb_path]}
                  alt={`Foto ${i + 1} de ${photos.length}`}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-24 w-24 place-items-center rounded-lg bg-[var(--sage)] text-xs text-[var(--muted)]">
                  Foto
                </span>
              )}
            </button>
            {editing && canDelete(p) && (
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={`Quitar la foto ${i + 1}`}
                className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}

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
          <img src={big} alt="Foto de la observación" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}