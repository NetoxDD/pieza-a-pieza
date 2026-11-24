"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useToday } from "@/components/TodayProvider";
import { doseError } from "@/lib/meds";

function clock12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "p. m." : "a. m."}`;
}

// Con un toque solo se registra si la toma es dentro de la próxima hora
const ONE_TAP_WINDOW_MS = 60 * 60000;

// "Lo siguiente": lo único que importa ahora, con un solo botón.
export default function NextUp() {
  const t = useToday();
  const { child } = useChild();
  const slot = t.nextSlot;
  const medId = slot?.medId;

  const [canGive, setCanGive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
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

  const give = async () => {
    if (!slot) return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase.from("med_doses").insert({
      medication_id: slot.medId,
      child_id: child.id,
      kind: "programada",
      scheduled_date: slot.date,
      scheduled_time: slot.time,
      status: "dada",
      taken_at: new Date().toISOString(),
      note: null,
    });
    setBusy(false);
    if (e) {
      setError(
        e.code === "23505"
          ? "Otra persona ya registró esta toma un instante antes."
          : doseError(e.message)
      );
      return;
    }
    const hhmm = new Date().toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
    setDoneMsg(`${slot.med} · hoy a las ${hhmm}. Si fue un error, la familia puede corregirlo en Medicinas.`);
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

  const oneTap = !!slot && canGive && slot.due - now <= ONE_TAP_WINDOW_MS;

  let title: string;
  let sub: string;
  let cta: { href: string; label: string } | null = null;
  let tone = "";

  if (t.lateDoses > 0) {
    title = t.lateDoses === 1 ? "Hay una toma sin registrar" : `Hay ${t.lateDoses} tomas sin registrar`;
    sub = "Anota si ya se la dieron para que todo el equipo lo sepa.";
    cta = { href: "/registro/", label: "Registrar ahora" };
    tone = "text-[var(--danger)]";
  } else if (slot) {
    title = slot.med;
    sub = `Le toca a las ${clock12(slot.time)}.`;
    if (!oneTap) cta = { href: "/registro/medicinas", label: "Registrar la toma" };
  } else if (t.pendingSteps > 0) {
    title = "Rutinas de hoy";
    sub = `Quedan ${t.pendingSteps} ${t.pendingSteps === 1 ? "paso" : "pasos"} por marcar.`;
    cta = { href: "/registro/", label: "Ver rutinas" };
  } else {
    title = "Todo al día";
    sub = "No hay nada pendiente por ahora.";
  }

  const allDone = !cta && !oneTap;

  return (
    <section
      aria-labelledby="next-title"
      className="grid gap-4 rounded-3xl bg-[var(--sand)] p-6 text-[var(--sand-text)] md:p-7"
    >
      <p className="text-xs font-extrabold uppercase tracking-widest">Lo siguiente</p>
      <div className="flex items-start gap-3">
        {allDone && <CircleCheck size={32} aria-hidden className="shrink-0 text-[var(--primary)]" />}
        <div>
          <h2 id="next-title" className={`text-2xl font-bold leading-tight md:text-3xl ${tone}`}>
            {title}
          </h2>
          <p className="mt-1 text-lg">{sub}</p>
        </div>
      </div>

      {oneTap && t.lateDoses === 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={give}
            disabled={busy}
            className="inline-flex min-h-14 items-center rounded-full bg-[var(--primary)] px-8 text-lg font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy ? "Anotando…" : "Ya se la di"}
          </button>
          <Link
            href="/registro/medicinas"
            className="inline-flex min-h-14 items-center rounded-full border-2 border-[var(--primary)] px-6 text-lg font-bold text-[var(--primary)] hover:bg-[var(--surface)]"
          >
            Todavía no
          </Link>
        </div>
      )}

      {cta && (
        <div>
          <Link
            href={cta.href}
            className="inline-flex min-h-14 items-center rounded-full bg-[var(--primary)] px-8 text-lg font-bold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
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
