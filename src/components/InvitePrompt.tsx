"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { roleLabel } from "@/lib/roles";
import { ROLE_BLURB } from "@/lib/invites";

type Preview = { child: string; role: string; expires_at: string; already: boolean };
type State = "loading" | "ok" | "invalid" | "error";

const shell = "grid min-h-screen place-items-center bg-[var(--background)] p-5";
const card =
  "grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const ghost =
  "min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]";

export default function InvitePrompt({
  code,
  onJoined,
  onDismiss,
}: {
  code: string;
  onJoined: (childId: string) => void;
  onDismiss: () => void;
}) {
  const [state, setState] = useState<State>("loading");
  const [pv, setPv] = useState<Preview | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("invite_preview", { invite_code: code });
      if (cancelled) return;
      if (error) {
        setMsg(error.message.startsWith("Demasiados") ? error.message : "No se pudo revisar la invitación. Revisa tu conexión.");
        setState("error");
        return;
      }
      if (!data) {
        setState("invalid");
        return;
      }
      setPv(data as Preview);
      setState("ok");
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (state !== "loading") headRef.current?.focus();
  }, [state]);

  const join = async () => {
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.rpc("join_child", { invite_code: code });
    setBusy(false);
    if (error || !data) {
      setMsg(
        error?.message?.startsWith("Demasiados")
          ? error.message
          : "No se pudo unir. Puede que la invitación se haya usado o vencido."
      );
      return;
    }
    onJoined(data as string);
  };

  if (state === "loading") {
    return (
      <div className={shell}>
        <p className="text-sm text-[var(--muted)]">Revisando tu invitación…</p>
      </div>
    );
  }

  if (state === "invalid" || state === "error") {
    return (
      <div className={shell}>
        <div className={card}>
          <h1 ref={headRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            {state === "invalid" ? "Esta invitación ya no sirve" : "No pudimos revisar la invitación"}
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {state === "invalid"
              ? "El enlace no es válido, ya se usó o venció. Pide uno nuevo a la familia."
              : msg}
          </p>
          <button type="button" onClick={onDismiss} className={primary}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  const role = pv?.role ?? "";
  return (
    <div className={shell}>
      <div className={card}>
        {pv?.already ? (
          <>
            <h1 ref={headRef} tabIndex={-1} className="text-xl font-semibold outline-none">
              Ya formas parte de este espacio
            </h1>
            <p className="text-sm text-[var(--muted)]">
              Esta invitación es para el espacio de {pv.child}, y ya estás en el equipo. La invitación sigue
              disponible para otra persona.
            </p>
            <button type="button" onClick={onDismiss} className={primary}>
              Continuar
            </button>
          </>
        ) : (
          <>
            <h1 ref={headRef} tabIndex={-1} className="text-xl font-semibold outline-none">
              Te invitaron a un espacio
            </h1>
            <p className="text-base [overflow-wrap:anywhere]">
              Te invitaron a unirte al espacio de <strong>{pv?.child}</strong> como{" "}
              <strong>{(roleLabel[role] ?? role).toLowerCase()}</strong>.
            </p>
            <p className="text-sm text-[var(--muted)]">{ROLE_BLURB[role] ?? ""}</p>
            {msg && (
              <p role="alert" className="text-sm text-[var(--danger)]">
                {msg}
              </p>
            )}
            <div className="grid gap-2">
              <button type="button" onClick={join} disabled={busy} className={primary}>
                {busy ? "Uniéndote…" : "Unirme"}
              </button>
              <button type="button" onClick={onDismiss} disabled={busy} className={ghost}>
                Ahora no
              </button>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Si dices «Ahora no», la invitación no se gasta y podrás usarla más tarde desde el mismo enlace.
            </p>
          </>
        )}
      </div>
    </div>
  );
}