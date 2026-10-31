"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import Link from "next/link";
import { roleLabel } from "@/lib/roles";

type Msg = { id: string; author_id: string; body: string; created_at: string };

const quickReplies = [
  "¡Gracias por compartirlo!",
  "Lo probamos y os cuento",
  "Lo comentamos en la revisión",
];

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

export default function Comunicacion() {
  const { child, userId } = useChild();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [roles, setRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [m, mem, prof] = await Promise.all([
      supabase
        .from("messages")
        .select("id,author_id,body,created_at")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("child_members").select("user_id,role").eq("child_id", child.id),
      supabase.from("profiles").select("id,full_name"),
    ]);

    if (m.error || mem.error || prof.error) {
      setError("No se pudieron cargar los mensajes.");
    } else {
      setError("");
      setMessages((m.data as Msg[]).slice().reverse());
      setRoles(Object.fromEntries(mem.data.map((x) => [x.user_id, x.role])));
      setNames(Object.fromEntries(prof.data.map((x) => [x.id, x.full_name])));
    }
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Mensajes en vivo: cuando alguien escribe, se recarga la lista
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${child.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `child_id=eq.${child.id}` },
        () => load()
      )
      .subscribe();

    // Respaldo: si el canal en vivo fallara, se actualiza cada 30 segundos
    const timer = setInterval(load, 30000);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  useEffect(() => {
    const box = boxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  const send = async (content: string) => {
    const body = content.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    const { error } = await supabase.from("messages").insert({ child_id: child.id, body });
    setSending(false);
    if (error) {
      setError("No se pudo enviar el mensaje. Intenta de nuevo.");
      return;
    }
    setText("");
    load();
  };

  const authorLabel = (id: string) => {
    const name = names[id] || "Alguien del equipo";
    const role = roleLabel[roles[id]];
    return role ? `${name} · ${role}` : name;
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
          <header className="border-b border-[var(--border)] pb-4">
            <h2 className="font-semibold leading-tight">Equipo de {child.name}</h2>
            <small className="text-xs text-[var(--muted)]">
              Los mensajes llegan en vivo a todas las personas del equipo.
            </small>
          </header>

          <div
            ref={boxRef}
            role="log"
            aria-live="polite"
            aria-label="Mensajes del equipo"
            className="mt-4 flex h-[420px] flex-col gap-4 overflow-y-auto pr-1"
          >
            {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}
            {!loading && messages.length === 0 && (
              <p className="m-auto text-center text-sm text-[var(--muted)]">
                Aún no hay mensajes. Escribe el primero.
              </p>
            )}

            {messages.map((m, i) => {
              const mine = m.author_id === userId;
              const newDay = i === 0 || dayLabel(messages[i - 1].created_at) !== dayLabel(m.created_at);
              return (
                <div key={m.id} className="flex flex-col gap-4">
                  {newDay && (
                    <small className="text-center text-xs capitalize text-[var(--muted)]">
                      {dayLabel(m.created_at)}
                    </small>
                  )}
                  <div
                    className={`w-[92%] rounded-xl p-4 sm:w-[85%] ${
                      mine
                        ? "self-end rounded-br-sm bg-[var(--sage)]"
                        : "self-start rounded-bl-sm bg-[var(--background)]"
                    }`}
                  >
                    <div className="flex justify-between gap-3 text-[0.6875rem]">
                      <strong>{mine ? "Tú" : authorLabel(m.author_id)}</strong>
                      <time className="shrink-0 text-[var(--muted)]" dateTime={m.created_at}>
                        {new Date(m.created_at).toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]">{m.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={sending}
                className="min-h-11 rounded-full border border-[var(--border)] px-4 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--sage)] disabled:opacity-50"
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
                maxLength={2000}
                placeholder="Escribe al equipo…"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Enviar mensaje"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} aria-hidden />
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}
        </section>

        <aside className="grid gap-6">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">El equipo</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
             Quiénes participan, sus roles y las invitaciones.
            </p>
            <Link
                href="/equipo"
                className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                Ver y gestionar el equipo →
            </Link>
          </section>
          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
            Cada persona responde según su disponibilidad. Este canal no atiende urgencias.
          </div>
        </aside>
      </div>
    </div>
  );
}