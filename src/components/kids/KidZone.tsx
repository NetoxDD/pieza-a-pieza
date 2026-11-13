"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import PinPad from "@/components/kids/PinPad";
import KidRoutine from "@/components/kids/KidRoutine";
import KidFeelings from "@/components/kids/KidFeelings";
import FirstThen from "@/components/kids/FirstThen";
import Breathe from "@/components/kids/Breathe";
import Memory from "@/components/kids/Memory";
import { checkPin, clearPin, hasPin, savePin } from "@/lib/kids";

type Stage = "loading" | "setpin" | "confirmpin" | "play" | "exit";
type Screen = "home" | "routine" | "feel" | "firstthen" | "breathe" | "memory";

const MENU: { id: Exclude<Screen, "home">; emoji: string; label: string }[] = [
  { id: "routine", emoji: "🌞", label: "Mi día" },
  { id: "feel", emoji: "😊", label: "¿Cómo me siento?" },
  { id: "firstthen", emoji: "➡️", label: "Primero… Después…" },
  { id: "breathe", emoji: "🌬️", label: "Respira conmigo" },
  { id: "memory", emoji: "🧩", label: "Memorama" },
];

export default function KidZone() {
  const { child, userId } = useChild();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("loading");
  const [screen, setScreen] = useState<Screen>("home");
  const [firstPin, setFirstPin] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setStage(hasPin(userId) ? "play" : "setpin");
  }, [userId]);

  // La zona ocupa toda la pantalla y no deja desplazar lo de atrás
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const forgot = async () => {
    if (!window.confirm("Para crear un PIN nuevo tendrás que volver a iniciar sesión. ¿Continuar?")) return;
    clearPin(userId);
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        {stage === "loading" && <p className="text-[var(--muted)]">Cargando…</p>}

        {stage === "setpin" && (
          <PinPad    
            key="setpin"
            title="Crea un PIN de adulto"
            hint="Lo usarás para salir de la Zona de niños. Solo lo debe saber un adulto."
            notice={notice}
            onSubmit={async (pin) => {
              setNotice("");
              setFirstPin(pin);
              setStage("confirmpin");
              return null;
            }}
            onCancel={() => router.push("/")}
          />
        )}

        {stage === "confirmpin" && (
          <PinPad
            key="confirmpin"
            title="Repite el PIN"
            onSubmit={async (pin) => {
              if (pin !== firstPin) {
                setNotice("Los PIN no coincidían. Intenta de nuevo.");
                setStage("setpin");
                return null;
              }
              await savePin(userId, pin);
              setStage("play");
              return null;
            }}
            onCancel={() => setStage("setpin")}
          />
        )}

        {stage === "exit" && (
          <div className="grid gap-6">
            <PinPad
              key="exit"
              title="PIN de adulto"
              hint="Solo para adultos."
              onSubmit={async (pin) => {
                if (await checkPin(userId, pin)) {
                  router.push("/");
                  return null;
                }
                return "PIN incorrecto";
              }}
              onCancel={() => setStage("play")}
            />
            <div className="text-center">
              <button type="button" onClick={forgot} className="min-h-11 text-sm font-semibold text-[var(--muted)] underline">
                Olvidé mi PIN
              </button>
            </div>
          </div>
        )}

        {stage === "play" && (
          <div className="grid gap-6">
            <div className="flex items-center justify-between gap-3">
              {screen === "home" ? (
                <span />
              ) : (
                <button
                  type="button"
                  onClick={() => setScreen("home")}
                  className="inline-flex min-h-14 items-center gap-2 rounded-2xl border-2 border-[var(--border)] px-5 text-lg font-semibold hover:bg-[var(--sage)]"
                >
                  <ArrowLeft size={22} aria-hidden />
                  Volver
                </button>
              )}
              <button
                type="button"
                onClick={() => setStage("exit")}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
              >
                <Lock size={16} aria-hidden />
                Salir (adultos)
              </button>
            </div>

            {screen === "home" && (
              <>
                <div>
                  <h1 className="text-4xl font-bold [overflow-wrap:anywhere]">Hola, {child.name} 👋</h1>
                  <p className="mt-1 text-xl text-[var(--muted)]">¿Qué quieres hacer?</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {MENU.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setScreen(m.id)}
                      className="grid min-h-40 place-items-center gap-2 rounded-3xl border-4 border-[var(--border)] bg-[var(--surface)] p-4 hover:bg-[var(--sage)]"
                    >
                      <span aria-hidden className="text-6xl">
                        {m.emoji}
                      </span>
                      <span className="text-xl font-bold">{m.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {screen === "routine" && <KidRoutine />}
            {screen === "feel" && <KidFeelings />}
            {screen === "firstthen" && <FirstThen />}
            {screen === "breathe" && <Breathe />}
            {screen === "memory" && <Memory />}
          </div>
        )}
      </div>
    </div>
  );
}