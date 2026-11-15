"use client";

import { useEffect, useState } from "react";
import { Copy, QrCode, Share2 } from "lucide-react";
import { useChild } from "@/components/ChildGate";
import { roleLabel } from "@/lib/roles";
import { inviteLink, inviteMessage } from "@/lib/invites";

const btn =
  "inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]";

export default function InviteShare({ code, role }: { code: string; role: string }) {
  const { child } = useChild();
  const [link, setLink] = useState("");
  const [qr, setQr] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setLink(inviteLink(code));
    setQr("");
    setShowQr(false);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [code]);

  const first = child.name.trim().split(/\s+/)[0];
  const message = link ? inviteMessage(first, roleLabel[role] ?? role, link) : "";

  const copy = async (text: string, id: string) => {
    setError("");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("No se pudo copiar. Mantén presionado el enlace y cópialo a mano.");
    }
  };

  const share = async () => {
    setError("");
    try {
      await navigator.share({ title: "Invitación a Pieza a pieza", text: message });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError("No se pudo abrir el menú de compartir.");
    }
  };

  const toggleQr = async () => {
    const next = !showQr;
    setShowQr(next);
    if (next && !qr && link) {
      try {
        const mod = await import("qrcode");
        const fn = mod.toDataURL ?? (mod as unknown as { default: typeof mod }).default.toDataURL;
        setQr(await fn(link, { margin: 2, width: 280, errorCorrectionLevel: "M" }));
      } catch {
        setError("No se pudo generar el código QR.");
      }
    }
  };

  return (
    <div className="mt-3 grid gap-3 rounded-xl bg-[var(--background)] p-4">
      <p className="text-xs [overflow-wrap:anywhere] text-[var(--muted)]">{link}</p>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => copy(link, "link")} className={btn}>
          <Copy size={14} aria-hidden />
          {copied === "link" ? "✓ Enlace copiado" : "Copiar enlace"}
        </button>
        <button type="button" onClick={() => copy(message, "msg")} className={btn}>
          <Copy size={14} aria-hidden />
          {copied === "msg" ? "✓ Mensaje copiado" : "Copiar mensaje"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className={btn}>
            <Share2 size={14} aria-hidden />
            Compartir…
          </button>
        )}
        <button type="button" onClick={toggleQr} aria-expanded={showQr} className={btn}>
          <QrCode size={14} aria-hidden />
          {showQr ? "Ocultar código QR" : "Mostrar código QR"}
        </button>
      </div>

      {showQr && qr && (
        <div className="grid justify-items-start gap-2">
          <div className="rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt={`Código QR para unirse al espacio de ${first} como ${(roleLabel[role] ?? role).toLowerCase()}`}
              width={220}
              height={220}
            />
          </div>
          <p className="text-xs text-[var(--muted)]">Pídele que lo escanee con la cámara de su celular.</p>
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        Cualquiera que tenga este enlace puede unirse con este rol, una sola vez, hasta que venza (7 días) o lo
        revoques. Compártelo solo con la persona a quien invitas.
      </p>

      {error && (
        <p role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </p>
      )}
    </div>
  );
}