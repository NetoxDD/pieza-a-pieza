"use client";

import { useRef, useState, type ReactNode } from "react";
import { useDismiss } from "@/lib/useDismiss";

// Botón del encabezado que abre un menú flotante. Se cierra al pulsar fuera o con Esc.
export default function HeaderMenu({
  label,
  button,
  buttonClass = "",
  panelClass = "w-80",
  children,
}: {
  label: string;
  button: ReactNode;
  buttonClass?: string;
  panelClass?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useDismiss(open, () => setOpen(false), wrapRef, btnRef);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className={buttonClass}
      >
        {button}
      </button>
      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 max-w-[90vw] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-lg ${panelClass}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
