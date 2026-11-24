"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Delete, Volume2, X } from "lucide-react";
import { BASE } from "@/lib/base";
import data from "@/lib/comunicacion.json";

type Item = { key: string; label: string; emoji: string; query: string };

const CATEGORIES = data.categories as { id: string; title: string; emoji: string; items: Item[] }[];
const MAX = 8;

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-MX";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("es"));
  if (voice) u.voice = voice;
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return true;
}

// Pictograma de ARASAAC guardado en la app; si falta, se muestra el emoji
function Picto({ item, size }: { item: Item; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span aria-hidden style={{ fontSize: size * 0.7, lineHeight: 1 }}>
        {item.emoji}
      </span>
    );
  }
  return (
    <img
      src={`${BASE}/pictogramas/${item.key}.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

export default function TalkBoard() {
  const [catId, setCatId] = useState(CATEGORIES[0].id);
  const [phrase, setPhrase] = useState<Item[]>([]);
  const [noVoice, setNoVoice] = useState(false);
  const cat = CATEGORIES.find((c) => c.id === catId) ?? CATEGORIES[0];

  const tap = (it: Item) => {
    setPhrase((p) => (p.length >= MAX ? p : [...p, it]));
    if (!speak(it.label)) setNoVoice(true);
  };
  const sayAll = () => {
    if (phrase.length && !speak(phrase.map((p) => p.label).join(" "))) setNoVoice(true);
  };

  return (
    <div className="grid gap-5">
      <h1 className="text-4xl font-bold">Quiero decir</h1>

      {/* Frase armada */}
      <section aria-label="Mi frase" className="grid gap-3 rounded-3xl border-4 border-[var(--primary)] bg-[var(--surface)] p-4">
        <div className="flex min-h-28 flex-wrap items-center gap-3" aria-live="polite">
          {phrase.length === 0 ? (
            <p className="text-xl text-[var(--muted)]">Toca los dibujos para armar lo que quieres decir.</p>
          ) : (
            phrase.map((it, i) => (
              <span key={i} className="grid w-24 justify-items-center gap-1 rounded-2xl bg-[var(--sage)] p-2">
                <Picto item={it} size={64} />
                <span className="text-base font-bold">{it.label}</span>
              </span>
            ))
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={sayAll}
            disabled={phrase.length === 0}
            className="inline-flex min-h-16 items-center gap-3 rounded-2xl bg-[var(--primary)] px-8 text-2xl font-bold text-[var(--on-primary)] disabled:opacity-40"
          >
            <Volume2 size={28} aria-hidden />
            Decir
          </button>
          <button
            type="button"
            onClick={() => setPhrase((p) => p.slice(0, -1))}
            disabled={phrase.length === 0}
            aria-label="Quitar el último dibujo"
            className="inline-flex min-h-16 items-center gap-2 rounded-2xl border-4 border-[var(--border)] px-6 text-xl font-semibold disabled:opacity-40"
          >
            <Delete size={26} aria-hidden />
            Quitar
          </button>
          <button
            type="button"
            onClick={() => setPhrase([])}
            disabled={phrase.length === 0}
            className="inline-flex min-h-16 items-center gap-2 rounded-2xl border-4 border-[var(--border)] px-6 text-xl font-semibold disabled:opacity-40"
          >
            <X size={26} aria-hidden />
            Borrar todo
          </button>
        </div>
        {noVoice && (
          <p role="status" className="text-base text-[var(--muted)]">
            Este dispositivo no puede leer en voz alta. Muestra la frase a un adulto.
          </p>
        )}
      </section>

      {/* Categorías */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de dibujos">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.id === catId}
            onClick={() => setCatId(c.id)}
            className={`inline-flex min-h-14 items-center gap-2 rounded-2xl border-4 px-4 text-lg font-bold ${
              c.id === catId
                ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
                : "border-[var(--border)] hover:bg-[var(--sage)]"
            }`}
          >
            <span aria-hidden className="text-2xl">
              {c.emoji}
            </span>
            {c.title}
          </button>
        ))}
      </div>

      {/* Dibujos */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" role="group" aria-label={cat.title}>
        {cat.items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => tap(it)}
            className="grid min-h-40 place-items-center gap-2 rounded-3xl border-4 border-[var(--border)] bg-[var(--surface)] p-3 active:bg-[var(--sage)] hover:bg-[var(--sage)]"
          >
            <Picto item={it} size={96} />
            <span className="text-xl font-bold">{it.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-[var(--muted)]">
        Pictogramas: ARASAAC (arasaac.org). Autor: Sergio Palao. Propiedad del Gobierno de Aragón, con licencia CC BY-NC-SA.
      </p>
    </div>
  );
}
