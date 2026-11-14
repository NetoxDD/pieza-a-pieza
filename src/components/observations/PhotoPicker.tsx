"use client";

import { useEffect, useMemo, useRef } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

export default function PhotoPicker({
  files,
  onChange,
  max,
  disabled,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  max: number;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...files, ...Array.from(list)].slice(0, max));
  };

  const full = files.length >= max;
  const btn =
    "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-40";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled || full} className={btn}>
          <ImagePlus size={16} aria-hidden />
          Añadir foto
        </button>
        <button type="button" onClick={() => camRef.current?.click()} disabled={disabled || full} className={btn}>
          <Camera size={16} aria-hidden />
          Tomar foto
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          add(e.target.files);
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
          add(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[i]} alt={`Foto ${i + 1} por subir`} className="h-20 w-20 rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={`Quitar la foto ${i + 1}`}
                className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-[var(--muted)]">
        Hasta {max} {max === 1 ? "foto" : "fotos"}. Se reducen y pierden la ubicación y otros datos ocultos.
      </p>
    </div>
  );
}