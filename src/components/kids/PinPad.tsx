"use client";

import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";

export default function PinPad({
  title,
  hint,
  notice,
  onSubmit,
  onCancel,
}: {
  title: string;
  hint?: string;
  notice?: string;
  onSubmit: (pin: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(0);
  const fails = useRef(0);
  const busy = useRef(false);
  const locked = lockedUntil > now;

  useEffect(() => {
    if (lockedUntil === 0) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const add = (d: string) => {
    if (locked || busy.current) return;
    setError("");
    setPin((p) => (p.length < 4 ? p + d : p));
  };
  const remove = () => {
    if (busy.current) return;
    setPin((p) => p.slice(0, -1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) add(e.key);
      else if (e.key === "Backspace") remove();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (pin.length !== 4 || busy.current) return;
    busy.current = true;
    onSubmit(pin).then((err) => {
      busy.current = false;
      if (!err) return;
      setPin("");
      fails.current += 1;
      if (fails.current >= 5) {
        fails.current = 0;
        const t = Date.now();
        setNow(t);
        setLockedUntil(t + 30000);
        setError("Demasiados intentos. Espera 30 segundos.");
      } else {
        setError(err);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const key =
    "min-h-16 rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] text-2xl font-bold hover:bg-[var(--sage)] disabled:opacity-40";

  return (
    <div className="mx-auto grid max-w-xs gap-5 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      {hint && <p className="text-sm text-[var(--muted)]">{hint}</p>}
      {notice && (
        <p role="status" className="text-sm font-semibold text-[var(--danger)]">
          {notice}
        </p>
      )}

      <div className="flex justify-center gap-3" aria-label={`${pin.length} de 4 dígitos`} role="img">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-5 w-5 rounded-full border-2 border-[var(--primary)] ${
              i < pin.length ? "bg-[var(--primary)]" : ""
            }`}
          />
        ))}
      </div>

      <p role="alert" className="min-h-5 text-sm font-semibold text-[var(--danger)]">
        {error}
      </p>

      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => add(d)} disabled={locked} className={key}>
            {d}
          </button>
        ))}
        {onCancel ? (
          <button type="button" onClick={onCancel} className="min-h-16 rounded-2xl text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]">
            Cancelar
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => add("0")} disabled={locked} className={key}>
          0
        </button>
        <button type="button" onClick={remove} aria-label="Borrar el último dígito" className={`${key} grid place-items-center`}>
          <Delete size={24} aria-hidden />
        </button>
      </div>
    </div>
  );
}