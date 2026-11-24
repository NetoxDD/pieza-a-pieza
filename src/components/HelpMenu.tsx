"use client";

import Link from "next/link";
import { CircleHelp, Lock, Settings, Sparkles } from "lucide-react";
import HeaderMenu from "@/components/HeaderMenu";
import { useSettings } from "@/components/SettingsProvider";

export default function HelpMenu() {
  const { restartOnboarding } = useSettings();
  const row =
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold hover:bg-[var(--sage)]";

  return (
    <HeaderMenu
      label="Ayuda"
      buttonClass="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--sage)]"
      button={<CircleHelp size={20} aria-hidden />}
      panelClass="w-72"
    >
      {(close) => (
        <>
          <p className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">Ayuda</p>
          <button
            type="button"
            className={row}
            onClick={() => {
              close();
              restartOnboarding();
            }}
          >
            <Sparkles size={18} aria-hidden className="text-[var(--primary)]" />
            Ver la guía otra vez
          </button>
          <Link href="/ajustes" onClick={close} className={row}>
            <Settings size={18} aria-hidden className="text-[var(--primary)]" />
            Letra, colores y estilo
          </Link>
          <Link href="/privacidad" onClick={close} className={row}>
            <Lock size={18} aria-hidden className="text-[var(--primary)]" />
            Aviso de privacidad
          </Link>
        </>
      )}
    </HeaderMenu>
  );
}
