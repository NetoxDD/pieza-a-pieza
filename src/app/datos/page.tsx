"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { countRows, download, exportMine, exportSpace } from "@/lib/exportData";

const today = () => new Date().toISOString().slice(0, 10);

export default function Datos() {
  const { child, userId } = useChild();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"" | "mine" | "space">("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("children").select("created_by").eq("id", child.id).single();
      if (!cancelled) setIsOwner(data?.created_by === userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id, userId]);

  const run = async (kind: "mine" | "space") => {
    setBusy(kind);
    setMsg("");
    setOk(false);
    try {
      const data = kind === "mine" ? await exportMine(userId) : await exportSpace(child.id);
      const total = countRows(data.datos);
      const { error } = await supabase.rpc("log_export", {
        cid: child.id,
        kind: kind === "mine" ? "mis_datos" : "espacio",
      });
      if (error) throw new Error(error.message);
      download(data, `pieza-a-pieza-${kind === "mine" ? "mis-datos" : "espacio"}-${today()}.json`);
      setOk(true);
      setMsg(`✓ Se descargó el archivo con ${total} registros.`);
    } catch {
      setMsg("No se pudo exportar. Revisa tu conexión e intenta de nuevo.");
    }
    setBusy("");
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Datos y privacidad</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lleva contigo tus datos y revisa quién ha accedido a qué.
        </p>
      </div>

      <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Exportar mis datos</h2>
        <p className="text-sm text-[var(--muted)]">
          Un archivo con lo que es tuyo: tu perfil y ajustes, y lo que escribiste o registraste
          (observaciones, mensajes, dosis, estados de ánimo y más). No incluye datos de otras personas.
        </p>
        <div>
          <button
            type="button"
            onClick={() => run("mine")}
            disabled={busy !== ""}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60"
          >
            <Download size={16} aria-hidden />
            {busy === "mine" ? "Preparando…" : "Descargar mis datos (JSON)"}
          </button>
        </div>
      </section>

      {isOwner && (
        <>
          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Exportar los datos del espacio</h2>
            <p className="text-sm text-[var(--muted)]">
              Todo lo que hay del niño en este espacio: ficha, medicinas y dosis, inventario, rutinas,
              observaciones, ánimo, objetivos, calendario, mensajes y la lista de documentos y material.
              Solo lo puede hacer el familiar principal.
            </p>
            <div>
              <button
                type="button"
                onClick={() => run("space")}
                disabled={busy !== ""}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                <Download size={16} aria-hidden />
                {busy === "space" ? "Preparando…" : "Descargar los datos del espacio (JSON)"}
              </button>
            </div>
          </section>

          <section className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Historial de accesos y cambios</h2>
            <p className="text-sm text-[var(--muted)]">
              Quién abrió documentos o la ficha de emergencia, y quién cambió permisos, medicinas y más.
            </p>
            <div>
              <Link
                href="/datos/historial"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                <History size={16} aria-hidden />
                Ver el historial
              </Link>
            </div>
          </section>
        </>
      )}

      {msg && (
        <p
          role={ok ? "status" : "alert"}
          className={`text-sm ${ok ? "font-medium text-[var(--primary)]" : "text-[var(--danger)]"}`}
        >
          {msg}
        </p>
      )}

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        El archivo descargado <strong>no está cifrado</strong> y puede contener datos de salud de un menor.
        Guárdalo en un lugar seguro y no lo compartas por canales abiertos. Los archivos subidos
        (documentos y material) no van dentro del JSON: descárgalos desde su sección; el archivo incluye su
        lista. Cada exportación queda anotada en el historial. Proyecto escolar: usa datos de ejemplo.
      </div>
    </div>
  );
}