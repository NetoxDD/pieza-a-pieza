"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useToday } from "@/components/TodayProvider";
import { atTime, doseError } from "@/lib/meds";
import { isNetworkError } from "@/lib/offlineQueue";

function clock12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "p. m." : "a. m."}`;
}

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Dentro de la próxima hora se registra con un toque; más lejos pide confirmar
const ONE_TAP_WINDOW_MS = 60 * 60000;

type Step = "idle" | "confirm" | "time";

// "Lo siguiente": lo único que importa ahora, con un solo botón.
export default function NextUp() {
  const t = useToday();
  const { child } = useChild();
  const late = t.lateSlot;
  const slot = late ?? t.nextSlot;
  const dueMs = t.nextSlot?.due ?? 0;
  const medId = slot?.medId;

  const [canGive, setCanGive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [timeValue, setTimeValue] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // ¿Esta persona puede dar esta medicina? Lo decide la base de datos
  useEffect(() => {
    if (!medId) return;
    let off = false;
    supabase.rpc("my_administrable", { cid: child.id }).then(({ data, error: e }) => {
      if (off || e) return;
      setCanGive((data as { medication_id: string }[]).some((x) => x.medication_id === medId));
    });
    return () => {
      off = true;
    };
  }, [child.id, medId]);

  useEffect(() => {
    if (!doneMsg) return;
    const id = setTimeout(() => setDoneMsg(""), 9000);
    return () => clearTimeout(id);
  }, [doneMsg]);

  const give = async (takenAt: Date) => {
    if (!slot) return;
    if (takenAt.getTime() > Date.now() + 10 * 60000) {
      setError("La hora no puede ser en el futuro.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: e } = await supabase.from("med_doses").insert({
      medication_id: slot.medId,
      child_id: child.id,
      kind: "programada",
      scheduled_date: slot.date,
      scheduled_time: slot.time,
      status: "dada",
      taken_at: takenAt.toISOString(),
      note: null,
    });
    setBusy(false);
    if (e) {
      if (isNetworkError(e)) {
        setError("Sin conexión: la toma NO se registró. Para evitar que se repita, avisa a quien esté con él y vuelve a intentarlo cuando haya señal.");
        return;
      }
      setError(
        e.code === "23505" ? "Otra persona ya registró esta toma un instante antes." : doseError(e.message)
      );
      return;
    }
    setStep("idle");
    const hhmm = takenAt.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
    setDoneMsg(`${slot.med} · ${hhmm}. Si fue un error, la familia puede corregirlo en Medicinas.`);
  };

  // Una toma atrasada puede ser de ayer: una hora "del futuro" es de la noche anterior
  const takenFromInput = () => {
    let d = atTime(timeValue, new Date());
    if (late?.yesterday && d.getTime() > Date.now() + 5 * 60000) d = atTime(timeValue, new Date(Date.now() - 86400000));
    return d;
  };

  const onYes = () => {
    setError("");
    if (late) {
      setTimeValue(nowHHMM());
      setStep("time");
    } else if (dueMs - now > ONE_TAP_WINDOW_MS) {
      setStep("confirm");
    } else {
      give(new Date());
    }
  };

  if (!t.loaded) return null;

  if (doneMsg) {
    return (
      <section className="flex items-center gap-4 rounded-3xl bg-[var(--sage)] p-6 md:p-7" role="status">
        <CircleCheck size={40} aria-hidden className="shrink-0 text-[var(--primary)]" />
        <div>
          <p className="text-2xl font-bold text-[var(--primary)]">¡Listo, anotado!</p>
          <p className="mt-1 text-base">{doneMsg}</p>
        </div>
      </section>
    );
  }

  const canTap = !!slot && canGive;
  const more = t.lateDoses > 1 ? ` (y ${t.lateDoses - 1} más)` : "";

  let title: string;
  let sub: string;
  let tone = "";
  let cta: { href: string; label: string } | null = null;

  if (late) {
    title = `${late.med}${more}`;
    sub = `Era a las ${clock12(late.time)} y no está registrada. ¿Ya se la dieron?`;
    tone = "text-[var(--danger)]";
    if (!canTap) cta = { href: "/registro/", label: "Registrar ahora" };
  } else if (slot) {
    title = slot.med;
    sub = `Le toca a las ${clock12(slot.time)}.`;
    if (!canTap) cta = { href: "/registro/medicinas", label: "Registrar la toma" };
  } else if (t.pendingSteps > 0) {
    title = "Rutinas de hoy";
    sub = `Quedan ${t.pendingSteps} ${t.pendingSteps === 1 ? "paso" : "pasos"} por marcar.`;
    cta = { href: "/registro/", label: "Ver rutinas" };
  } else {
    title = "Todo al día";
    sub = "No hay nada pendiente por ahora.";
  }

  const allDone = !cta && !canTap;
  const primary =
    "inline-flex min-h-14 items-center rounded-full bg-[var(--primary)] px-8 text-lg font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60";
  const secondary =
    "inline-flex min-h-14 items-center rounded-full border-2 border-[var(--primary)] px-6 text-lg font-bold text-[var(--primary)] hover:bg-[var(--surface)]";

  return (
    <section
      aria-labelledby="next-title"
      className="grid gap-4 rounded-3xl bg-[var(--sand)] p-6 text-[var(--sand-text)] md:p-7"
    >
      <p className="text-xs font-extrabold uppercase tracking-widest">
        {late ? "Sin registrar" : "Lo siguiente"}
      </p>
      <div className="flex items-start gap-3">
        {allDone && <CircleCheck size={32} aria-hidden className="shrink-0 text-[var(--primary)]" />}
        <div>
          <h2 id="next-title" className={`text-2xl font-bold leading-tight md:text-3xl ${tone}`}>
            {title}
          </h2>
          <p className="mt-1 text-lg">{sub}</p>
        </div>
      </div>

      {canTap && step === "idle" && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onYes} disabled={busy} className={primary}>
            {busy ? "Anotando…" : "Ya se la di"}
          </button>
          <Link href="/registro/medicinas" className={secondary}>
            Todavía no
          </Link>
        </div>
      )}

      {canTap && step === "confirm" && slot && (
        <div className="grid gap-3 rounded-2xl bg-[var(--surface)] p-4 text-[var(--text)]">
          <p className="text-lg font-semibold">
            Todavía no es la hora ({clock12(slot.time)}). ¿Seguro que ya se la diste?
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => give(new Date())} disabled={busy} className={primary}>
              {busy ? "Anotando…" : "Sí, ya se la di"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className={secondary}>
              No
            </button>
          </div>
        </div>
      )}

      {canTap && step === "time" && (
        <div className="grid gap-3 rounded-2xl bg-[var(--surface)] p-4 text-[var(--text)]">
          <label className="grid gap-1 text-lg font-semibold">
            ¿A qué hora se la dieron?
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="min-h-12 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-lg"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => give(takenFromInput())}
              disabled={busy || !timeValue}
              className={primary}
            >
              {busy ? "Anotando…" : "Anotar"}
            </button>
            <button type="button" onClick={() => setStep("idle")} className={secondary}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {cta && (
        <div>
          <Link href={cta.href} className={primary}>
            {cta.label}
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="text-base font-semibold text-[var(--danger)]">
          {error}{" "}
          <Link href="/registro/medicinas" className="underline">
            Registrar con más detalle
          </Link>
        </p>
      )}
    </section>
  );
}
