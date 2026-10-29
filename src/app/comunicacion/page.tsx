"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useChild } from "@/components/ChildGate";
import TeamPanel from "@/components/TeamPanel";

type Message = {
  id: number;
  author: string;
  time: string;
  text: string;
  mine?: boolean;
};

const team = [
  { initials: "CL", name: "Clara López", role: "Madre · Tú", blue: false },
  { initials: "PL", name: "Pablo López", role: "Padre", blue: false },
  { initials: "AR", name: "Ana Ruiz", role: "Logopeda · Coordinadora", blue: true },
  { initials: "LM", name: "Lucía Martín", role: "Terapeuta ocupacional", blue: true },
  { initials: "DS", name: "Diego Santos", role: "Tutor", blue: true },
];

const initialMessages: Message[] = [
  {
    id: 1,
    author: "Clara · Familia",
    time: "09:10",
    mine: true,
    text: "Esta mañana Mateo eligió pasar por el parque con su tablero. Al avisarle antes de salir, el cambio de ruta fue más tranquilo. ¿Podemos usar las mismas imágenes en el cole?",
  },
  {
    id: 2,
    author: "Diego · Tutor",
    time: "10:05",
    text: "Sí, Clara. Hoy también eligió el primer paso al llegar al aula. Tendremos las imágenes junto a la puerta para que pueda consultarlas.",
  },
  {
    id: 3,
    author: "Ana · Logopeda",
    time: "10:20",
    text: "Podemos probar la misma secuencia en ambos espacios y observar qué le ayuda. Lo comentamos el lunes.",
  },
];

const quickReplies = ["¡Gracias por compartirlo!", "Lo probamos y os cuento", "Lo comentamos en la revisión"];

export default function Comunicacion() {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const { child } = useChild();

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const send = (content: string) => {
    const clean = content.trim();
    if (!clean) return;
    const time = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    setMessages((m) => [...m, { id: Date.now(), author: "Clara · Familia", time, text: clean, mine: true }]);
    setText("");
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversaciones que nos acercan</h1>
        <p className="mt-1 text-[var(--muted)]">
          Compartimos contexto, escuchamos y acordamos sus apoyos.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <header className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--sage)] text-xs font-bold text-[var(--primary)]">
              EQ
            </span>
            <div>
              <h2 className="font-semibold leading-tight">Equipo de {child.name}</h2>
              <small className="text-xs text-[var(--muted)]">5 participantes · Conversación de ejemplo</small>
            </div>
          </header>

          <div className="mt-4 rounded-xl bg-[var(--blue)] p-4 text-xs text-[var(--blue-text)]">
            <strong>Acuerdo del equipo · 21 oct</strong>
            <p className="mt-1">
              Anticipar las salidas con la misma secuencia visual en casa y en el aula.
            </p>
          </div>

          <div
            ref={boxRef}
            role="log"
            aria-live="polite"
            aria-label="Mensajes del equipo"
            className="mt-4 flex max-h-[440px] flex-col gap-4 overflow-y-auto pr-1"
          >
            <small className="text-center text-xs text-[var(--muted)]">23 de octubre de 2026</small>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`w-[92%] rounded-xl p-4 sm:w-[85%] ${
                  m.mine
                    ? "self-end rounded-br-sm bg-[var(--sage)]"
                    : "self-start rounded-bl-sm bg-[var(--background)]"
                }`}
              >
                <div className="flex justify-between gap-3 text-[11px]">
                  <strong>{m.author}</strong>
                  <span className="text-[var(--muted)]">{m.time}</span>
                </div>
                <p className="mt-1 text-sm [overflow-wrap:anywhere]">{m.text.replaceAll("Mateo", child.name)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="min-h-11 rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--sage)]"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="mt-3 flex items-end gap-2"
          >
            <label className="grid flex-1 gap-1.5 text-xs font-semibold">
              <span className="sr-only">Tu mensaje</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(text);
                  }
                }}
                rows={2}
                placeholder="Escribe al equipo…"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Enviar mensaje"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} aria-hidden />
            </button>
          </form>
          <small className="mt-2 text-xs text-[var(--muted)]">
            Demostración: los mensajes se pierden al recargar.
          </small>
        </section>

        <aside className="grid gap-6">
            <TeamPanel />

          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[#74613d]">
            Cada persona responde según su disponibilidad. Este canal no atiende urgencias.
          </div>
        </aside>
      </div>
    </div>
  );
}