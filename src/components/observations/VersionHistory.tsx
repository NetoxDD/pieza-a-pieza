"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { tagLabel } from "@/lib/observations";

type Version = {
  version: number;
  category: string;
  body: string;
  tags: string[];
  saved_by: string;
  saved_at: string;
};

export default function VersionHistory({
  observationId,
  nameOf,
}: {
  observationId: string;
  nameOf: (id: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Version[] | null>(null);
  const [error, setError] = useState("");

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      const { data, error } = await supabase
        .from("observation_versions")
        .select("version,category,body,tags,saved_by,saved_at")
        .eq("observation_id", observationId)
        .order("version", { ascending: false });
      if (error) setError("No se pudo cargar el historial.");
      else setRows(data as Version[]);
    }
  };

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
      >
        {open ? "Ocultar versiones anteriores" : "Ver versiones anteriores"}
      </button>
      {open && (
        <div className="rounded-xl bg-[var(--background)] p-4">
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          {rows && rows.length === 0 && <p className="text-xs text-[var(--muted)]">No hay versiones anteriores.</p>}
          <ol className="grid gap-3">
            {rows?.map((v) => (
              <li key={v.version} className="text-sm">
                <p className="text-xs font-semibold text-[var(--muted)]">
                  Versión {v.version} · reemplazada por {nameOf(v.saved_by)} el{" "}
                  {new Date(v.saved_at).toLocaleString("es-MX", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{v.body}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {v.category}
                  {v.tags.length ? ` · ${v.tags.map(tagLabel).join(", ")}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}