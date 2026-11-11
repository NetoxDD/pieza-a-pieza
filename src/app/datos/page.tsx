"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, History, LogOut, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BASE } from "@/lib/base";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import { clearCopies } from "@/lib/emergency";
import { deleteSpace } from "@/lib/deleteSpace";
import { countRows, download, exportMine, exportSpace } from "@/lib/exportData";

const today = () => new Date().toISOString().slice(0, 10);

const ghost =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60";
const card = "grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6";

export default function Datos() {
  const { child, userId } = useChild();
  const { get } = useProfiles();
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [family, setFamily] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "mine" | "space" | "transfer" | "delete">("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [newOwner, setNewOwner] = useState("");
  const [confirmName, setConfirmName] = useState("");

  const say = (text: string, good = false) => {
    setMsg(text);
    setOk(good);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("children").select("created_by").eq("id", child.id).single();
      const owner = data?.created_by === userId;
      if (cancelled) return;
      setIsOwner(owner);
      if (owner) {
        const m = await supabase
          .from("child_members")
          .select("user_id")
          .eq("child_id", child.id)
          .eq("role", "familia")
          .neq("user_id", userId);
        if (!cancelled && !m.error) setFamily((m.data ?? []).map((x) => x.user_id as string));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [child.id, userId]);

  const run = async (kind: "mine" | "space") => {
    setBusy(kind);
    setMsg("");
    try {
      const data = kind === "mine" ? await exportMine(userId) : await exportSpace(child.id);
      const total = countRows(data.datos);
      const { error } = await supabase.rpc("log_export", {
        cid: child.id,
        kind: kind === "mine" ? "mis_datos" : "espacio",
      });
      if (error) throw new Error(error.message);
      download(data, `pieza-a-pieza-${kind === "mine" ? "mis-datos" : "espacio"}-${today()}.json`);
      say(`✓ Se descargó el archivo con ${total} registros.`, true);
    } catch {
      say("No se pudo exportar. Revisa tu conexión e intenta de nuevo.");
    }
    setBusy("");
  };

  const signOutAll = async () => {
    if (!window.confirm("¿Cerrar sesión en todos tus dispositivos, incluido este?")) return;
    clearCopies(); // la copia de la ficha de emergencia no debe quedar en este dispositivo
    await supabase.auth.signOut({ scope: "global" });
  };

  const transfer = async () => {
    if (!newOwner) return;
    const who = get(newOwner)?.name ?? "esa persona";
    if (!window.confirm(`¿Transferir la propiedad a ${who}? Dejarás de ser el familiar principal.`)) return;
    setBusy("transfer");
    setMsg("");
    const { error } = await supabase.rpc("transfer_ownership", { cid: child.id, new_owner: newOwner });
    setBusy("");
    if (error) {
      say(error.message);
      return;
    }
    say(`✓ ${who} es ahora el familiar principal.`, true);
    setIsOwner(false);
  };

  const canDelete = confirmName.trim() === child.name.trim();

  const remove = async () => {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Vas a borrar PARA SIEMPRE el espacio de ${child.name}: ficha, medicinas, registros, mensajes, documentos y archivos. No se puede deshacer. ¿Continuar?`
      )
    )
      return;
    setBusy("delete");
    setMsg("");
    try {
      await deleteSpace(child.id, confirmName);
      clearCopies(userId);
      window.location.assign(`${BASE}/`);
    } catch (e) {
      setBusy("");
      say(e instanceof Error ? e.message : "No se pudo eliminar el espacio.");
    }
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Datos y privacidad</h1>
        <p className="mt-1 text-[var(--muted)]">
          Lleva contigo tus datos, controla tus sesiones y revisa quién ha accedido a qué.
        </p>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold">Aviso de privacidad</h2>
        <p className="text-sm text-[var(--muted)]">
          Qué datos se guardan, para qué, quién los ve y cuáles son tus derechos.
        </p>
        <div>
          <Link href="/privacidad" className={ghost}>
            <ShieldCheck size={16} aria-hidden />
            Leer el aviso
          </Link>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Exportar mis datos</h2>
        <p className="text-sm text-[var(--muted)]">
          Un archivo con lo que es tuyo: tu perfil y ajustes, y lo que escribiste o registraste
          (observaciones, mensajes, dosis, estados de ánimo y más). No incluye datos de otras personas.
        </p>
        <div>
          <button type="button" onClick={() => run("mine")} disabled={busy !== ""} className={ghost}>
            <Download size={16} aria-hidden />
            {busy === "mine" ? "Preparando…" : "Descargar mis datos (JSON)"}
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-lg font-semibold">Mis sesiones</h2>
        <p className="text-sm text-[var(--muted)]">
          Si perdiste un dispositivo o usaste uno ajeno, cierra la sesión en todos. En los demás dispositivos
          dejará de funcionar en cuanto la app renueve la sesión (puede tardar hasta una hora) y su copia local
          de la ficha de emergencia se borra cuando vuelvan a conectarse y cierren sesión.
        </p>
        <div>
          <button type="button" onClick={signOutAll} className={ghost}>
            <LogOut size={16} aria-hidden />
            Cerrar sesión en todos los dispositivos
          </button>
        </div>
      </section>

      {isOwner && (
        <>
          <section className={card}>
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

          <section className={card}>
            <h2 className="text-lg font-semibold">Historial de accesos y cambios</h2>
            <p className="text-sm text-[var(--muted)]">
              Quién abrió documentos o la ficha de emergencia, y quién cambió permisos, medicinas y más.
            </p>
            <div>
              <Link href="/datos/historial" className={ghost}>
                <History size={16} aria-hidden />
                Ver el historial
              </Link>
            </div>
          </section>

          <section className={card}>
            <h2 className="text-lg font-semibold">Transferir la propiedad</h2>
            <p className="text-sm text-[var(--muted)]">
              El familiar principal ve el historial, exporta los datos y puede eliminar el espacio. Si quieres
              dejar ese papel (por ejemplo, para salir del equipo), pásalo a otra persona de la familia.
            </p>
            {family.length === 0 ? (
              <p className="rounded-xl bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
                Todavía no hay otra persona con el rol Familia en este espacio. Invítala desde Equipo.
              </p>
            ) : (
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1.5 text-xs font-semibold">
                  Nueva persona principal
                  <select
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
                  >
                    <option value="">Elige a alguien…</option>
                    {family.map((id) => (
                      <option key={id} value={id}>
                        {get(id)?.name ?? "Persona de la familia"}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={transfer} disabled={!newOwner || busy !== ""} className={ghost}>
                  <UserCog size={16} aria-hidden />
                  {busy === "transfer" ? "Transfiriendo…" : "Transferir"}
                </button>
              </div>
            )}
          </section>

          <section className="grid gap-3 rounded-2xl border-2 border-[var(--danger)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Eliminar el espacio de {child.name}</h2>
            <p className="text-sm">
              Borra <strong>para siempre</strong> la ficha, las medicinas y su historial, los registros, los
              mensajes, los documentos y todos los archivos. Todo el equipo pierde el acceso. No se puede
              deshacer.
            </p>
            <p className="text-sm text-[var(--muted)]">
              Antes, te recomendamos{" "}
              <strong>descargar los datos del espacio</strong> (arriba) y bajar de Documentos los archivos que
              quieras conservar. Las copias de seguridad del proveedor podrían conservar datos un tiempo.
            </p>
            <label className="grid gap-1.5 text-xs font-semibold">
              Para confirmar, escribe el nombre exacto: <span className="font-bold">{child.name}</span>
              <input
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoComplete="off"
                className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
              />
            </label>
            <div>
              <button
                type="button"
                onClick={remove}
                disabled={!canDelete || busy !== ""}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--danger)] px-5 text-sm font-semibold text-[var(--surface)] disabled:opacity-40"
              >
                <Trash2 size={16} aria-hidden />
                {busy === "delete" ? "Eliminando…" : "Eliminar el espacio para siempre"}
              </button>
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
        Guárdalo en un lugar seguro. Los archivos subidos (documentos y material) no van dentro del JSON:
        descárgalos desde su sección. Cada exportación y cada transferencia quedan en el historial. Proyecto
        escolar: usa datos de ejemplo.
      </div>
    </div>
  );
}