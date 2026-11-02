"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CONFIGURABLE_ROLES } from "@/lib/ficha";
import { roleLabel } from "@/lib/roles";
import type { Folder } from "@/lib/documents";

type Row = { role: string; can_view: boolean; can_upload: boolean };

export default function FolderAccessPanel({ folder }: { folder: Folder }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("document_folder_access")
      .select("role,can_view,can_upload")
      .eq("folder_id", folder.id);
    if (error) setMsg("No se pudieron cargar los permisos.");
    else {
      setMsg("");
      setRows(data as Row[]);
    }
  }, [folder.id]);

  useEffect(() => {
    load();
  }, [load]);

  const eff = (role: string): Row =>
    rows.find((r) => r.role === role) ?? { role, can_view: false, can_upload: false };

  const set = async (role: string, view: boolean, upload: boolean) => {
    // Subir implica ver; quitar el permiso de ver quita también el de subir
    if (upload) view = true;
    if (!view) upload = false;
    setBusy(true);
    setMsg("");
    const result =
      !view && !upload
        ? await supabase.from("document_folder_access").delete().eq("folder_id", folder.id).eq("role", role)
        : await supabase
            .from("document_folder_access")
            .upsert(
              { folder_id: folder.id, role, can_view: view, can_upload: upload },
              { onConflict: "folder_id,role" }
            );
    setBusy(false);
    if (result.error) setMsg("No se pudo guardar el cambio.");
    await load();
  };

  return (
    <div className="grid gap-3 rounded-xl bg-[var(--background)] p-4">
      <div>
        <h3 className="text-sm font-semibold">Quién puede usar «{folder.name}»</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          La familia siempre puede ver y subir. Los cambios se aplican de inmediato y quedan en el
          historial.
        </p>
      </div>

      <ul className="grid gap-2">
        {CONFIGURABLE_ROLES.map((role) => {
          const r = eff(role);
          return (
            <li
              key={role}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1"
            >
              <span className="text-sm font-semibold">{roleLabel[role]}</span>
              <span className="flex flex-wrap gap-x-4">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.can_view}
                    disabled={busy}
                    onChange={(e) => set(role, e.target.checked, r.can_upload)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Puede ver
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={r.can_upload}
                    disabled={busy}
                    onChange={(e) => set(role, r.can_view, e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Puede subir
                </label>
              </span>
            </li>
          );
        })}
      </ul>

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </div>
  );
}