"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import HeaderMenu from "@/components/HeaderMenu";
import { useToday } from "@/components/TodayProvider";

export default function AlertsMenu() {
  const t = useToday();
  const count = t.alerts.length + (t.lateDoses > 0 ? 1 : 0);

  return (
    <HeaderMenu
      label={count > 0 ? `Avisos: ${count} ${count === 1 ? "nuevo" : "nuevos"}` : "Avisos: ninguno"}
      buttonClass="relative grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-[var(--sage)]"
      button={
        <>
          <Bell size={20} aria-hidden />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--danger)]"
            />
          )}
        </>
      }
      panelClass="w-80"
    >
      {(close) => (
        <>
          <p className="px-3 py-2 text-xs font-semibold text-[var(--muted)]">Avisos</p>
          {count === 0 ? (
            <p className="px-3 pb-3 text-sm">No hay avisos por ahora.</p>
          ) : (
            <ul>
              {t.lateDoses > 0 && (
                <li>
                  <Link
                    href="/registro/"
                    onClick={close}
                    className="flex min-h-12 items-center rounded-xl px-3 py-2 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--sage)]"
                  >
                    Hay {t.lateDoses} {t.lateDoses === 1 ? "toma sin registrar" : "tomas sin registrar"}
                  </Link>
                </li>
              )}
              {t.alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    onClick={close}
                    className={`flex min-h-12 items-center rounded-xl px-3 py-2 text-sm hover:bg-[var(--sage)] ${
                      a.tone === "atencion" ? "font-semibold text-[var(--danger)]" : ""
                    }`}
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </HeaderMenu>
  );
}
