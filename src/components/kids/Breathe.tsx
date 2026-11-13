"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";

const ROUNDS = 5;
const IN = 4;
const OUT = 6;

export default function Breathe() {
  const { settings } = useSettings();
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(
      () => {
        if (phase === "in") {
          setPhase("out");
        } else if (round + 1 >= ROUNDS) {
          setRunning(false);
          setFinished(true);
          setRound(0);
          setPhase("in");
        } else {
          setRound(round + 1);
          setPhase("in");
        }
      },
      (phase === "in" ? IN : OUT) * 1000
    );
    return () => clearTimeout(t);
  }, [running, phase, round]);

  const start = () => {
    setFinished(false);
    setRound(0);
    setPhase("in");
    setRunning(true);
  };

  const big = running && phase === "in";

  return (
    <div className="grid justify-items-center gap-6 text-center">
      <h1 className="text-4xl font-bold">Respira conmigo</h1>

      <div className="grid h-72 w-72 place-items-center" aria-hidden>
        <div
          className="h-64 w-64 rounded-full bg-[var(--sage)] ring-8 ring-[var(--primary)]"
          style={{
            transform: `scale(${big ? 1 : 0.6})`,
            transition: `transform ${phase === "in" ? IN : OUT}s ease-in-out`,
          }}
        />
      </div>

      <p className="min-h-24 text-3xl font-bold" aria-live="polite">
        {finished
          ? "¡Muy bien! 🌟"
          : !running
          ? "Cinco respiraciones tranquilas"
          : phase === "in"
          ? "Inhala por la nariz…"
          : "Sopla despacito…"}
      </p>

      {running && (
        <p className="text-xl text-[var(--muted)]">
          {round + 1} de {ROUNDS}
        </p>
      )}
      {settings.calm && !running && (
        <p className="text-sm text-[var(--muted)]">El círculo no se mueve porque el modo calma está activado.</p>
      )}

      <button
        type="button"
        onClick={running ? () => setRunning(false) : start}
        className="min-h-16 rounded-2xl bg-[var(--primary)] px-10 text-2xl font-bold text-[var(--on-primary)]"
      >
        {running ? "Parar" : finished ? "Otra vez" : "Empezar"}
      </button>
    </div>
  );
}