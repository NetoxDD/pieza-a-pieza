"use client";

import { useEffect, useRef, useState } from "react";

const FACES = [
  { face: "🐶", name: "perro" },
  { face: "🐱", name: "gato" },
  { face: "🐸", name: "rana" },
  { face: "🚗", name: "carro" },
  { face: "🍎", name: "manzana" },
  { face: "⭐", name: "estrella" },
];

type Card = { id: number; face: string; name: string; open: boolean; done: boolean };

function deal(): Card[] {
  const cards: Card[] = [...FACES, ...FACES].map((f, i) => ({ id: i, ...f, open: false, done: false }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function Memory() {
  const [cards, setCards] = useState<Card[]>([]);
  const [tries, setTries] = useState(0);
  const lock = useRef(false);

  // Se baraja ya en el navegador, para que no haya diferencias con la página prerenderizada
  useEffect(() => {
    setCards(deal());
  }, []);

  const flip = (id: number) => {
    if (lock.current) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.open || card.done) return;

    const next = cards.map((c) => (c.id === id ? { ...c, open: true } : c));
    setCards(next);

    const open = next.filter((c) => c.open && !c.done);
    if (open.length === 2) {
      setTries((t) => t + 1);
      const match = open[0].face === open[1].face;
      lock.current = true;
      setTimeout(
        () => {
          setCards((prev) =>
            prev.map((c) =>
              open.some((o) => o.id === c.id) ? (match ? { ...c, done: true } : { ...c, open: false }) : c
            )
          );
          lock.current = false;
        },
        match ? 500 : 1000
      );
    }
  };

  const reset = () => {
    lock.current = false;
    setTries(0);
    setCards(deal());
  };

  const won = cards.length > 0 && cards.every((c) => c.done);

  return (
    <div className="grid gap-5">
      <h1 className="text-4xl font-bold">Memorama</h1>
      <p className="text-lg text-[var(--muted)]">Busca las parejas iguales. Intentos: {tries}</p>

      {won && (
        <p role="status" className="rounded-3xl bg-[var(--sage)] p-5 text-center text-3xl font-bold text-[var(--primary)]">
          ¡Encontraste todas las parejas! 🎉
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" role="group" aria-label="Cartas">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => flip(c.id)}
            aria-label={c.open || c.done ? c.name : "Carta tapada"}
            className={`grid min-h-28 place-items-center rounded-2xl border-4 text-5xl ${
              c.done
                ? "border-[var(--primary)] bg-[var(--sage)]"
                : c.open
                ? "border-[var(--primary)] bg-[var(--surface)]"
                : "border-[var(--border)] bg-[var(--primary)] text-[var(--on-primary)]"
            }`}
          >
            <span aria-hidden>{c.open || c.done ? c.face : "?"}</span>
          </button>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={reset}
          className="min-h-12 rounded-2xl border-2 border-[var(--border)] px-6 text-lg font-semibold hover:bg-[var(--sage)]"
        >
          {won ? "Jugar otra vez" : "Barajar de nuevo"}
        </button>
      </div>
    </div>
  );
}