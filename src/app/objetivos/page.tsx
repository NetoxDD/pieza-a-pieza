"use client";

import { useChild } from "@/components/ChildGate";
import { useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const weekly = [
  { semana: "Sem 1", Expresar: 1, Anticipar: 0, Calma: 2 },
  { semana: "Sem 2", Expresar: 2, Anticipar: 1, Calma: 3 },
  { semana: "Sem 3", Expresar: 2, Anticipar: 2, Calma: 3 },
  { semana: "Sem 4", Expresar: 3, Anticipar: 2, Calma: 4 },
  { semana: "Sem 5", Expresar: 4, Anticipar: 3, Calma: 4 },
  { semana: "Sem 6", Expresar: 5, Anticipar: 3, Calma: 5 },
];

type Goal = {
  area: string;
  title: string;
  badge: string;
  badgeStyle: string;
  description: string;
  progress: number;
  supports: string[];
  observing: string;
  team: string;
};

const goals: Goal[] = [
  {
    area: "Comunicación",
    title: "Expresar lo que necesita",
    badge: "Nuevas iniciativas",
    badgeStyle: "bg-[var(--sage)] text-[var(--primary)]",
    description:
      "Facilitar que Mateo pueda pedir una pausa, elegir una actividad o expresar una necesidad de la forma que le resulte más cómoda.",
    progress: 60,
    supports: [
      "Tablero de comunicación disponible en casa y en el aula.",
      "Ofrecer opciones visuales sin exigir una respuesta oral.",
      "Dar tiempo para responder y respetar su elección.",
    ],
    observing: "Esta semana pidió una pausa en dos momentos nuevos.",
    team: "Acompañan: familia, Ana Ruiz y Diego Santos.",
  },
  {
    area: "Rutinas y transiciones",
    title: "Anticipar los cambios de actividad",
    badge: "Seguimos explorando",
    badgeStyle: "bg-[var(--blue)] text-[var(--blue-text)]",
    description:
      "Hacer más previsibles las transiciones y permitir que Mateo participe en la elección del siguiente paso.",
    progress: 45,
    supports: [
      "Usar una secuencia visual sencilla y conocida.",
      "Avisar con tiempo antes de cambiar de actividad.",
      "Adaptar el plan cuando necesite más tiempo o una pausa.",
    ],
    observing: "Reconoce la secuencia de la mañana y elige el primer paso.",
    team: "Acompañan: familia y equipo educativo.",
  },
  {
    area: "Bienestar y entorno",
    title: "Encontrar momentos de calma",
    badge: "Apoyo que funciona",
    badgeStyle: "bg-[var(--sage)] text-[var(--primary)]",
    description:
      "Facilitar el acceso a espacios y recursos que le ayuden a sentirse cómodo, respetando sus preferencias.",
    progress: 75,
    supports: [
      "Tener auriculares disponibles cuando los quiera utilizar.",
      "Ofrecer un rincón tranquilo sin aislarlo como castigo.",
      "Observar el contexto: ruido, luz y cambios inesperados.",
    ],
    observing: "Nos muestra cuándo prefiere ir a su rincón de lectura.",
    team: "Acompañan: familia y Lucía Martín.",
  },
];

function ProgressRing({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="img"
      aria-label={`Progreso de ${label}: ${value}%`}
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--primary) ${value * 3.6}deg, var(--sage) 0deg)`,
      }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface)] text-xs font-bold text-[var(--primary)]">
        {value}%
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const [active, setActive] = useState<boolean[]>(goal.supports.map(() => true));
  const count = active.filter(Boolean).length;

  const toggle = (i: number) =>
    setActive((a) => a.map((v, idx) => (idx === i ? !v : v)));

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
            {goal.area}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{goal.title}</h2>
          <span className={`mt-2 inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold ${goal.badgeStyle}`}>
            {goal.badge}
          </span>
        </div>
        <ProgressRing value={goal.progress} label={goal.title} />
      </div>

      <p className="mt-4 text-sm">{goal.description}</p>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Apoyos acordados</h3>
        <small className="text-xs text-[var(--muted)]">
          {count} de {goal.supports.length} en marcha
        </small>
      </div>

      <ul className="mt-2 grid gap-2">
        {goal.supports.map((s, i) => (
          <li key={s}>
            <label
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                active[i]
                  ? "border-[var(--primary)]/30 bg-[var(--sage)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              <input
                type="checkbox"
                checked={active[i]}
                onChange={() => toggle(i)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
              />
              <span>{s}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-r-lg border-l-4 border-[var(--primary)] bg-[var(--background)] p-4 text-sm">
        <strong>Lo que estamos observando</strong>
        <p className="mt-1">{goal.observing}</p>
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">{goal.team}</p>
    </article>
  );
}

export default function Objetivos() {
    const { child } = useChild();
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objetivos y apoyos</h1>
          <p className="mt-1 text-[var(--muted)]">
            Un plan compartido, flexible y centrado en lo que le ayuda.
          </p>
        </div>
        <Link
          href="/registro"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
        >
          Registrar un avance
        </Link>
      </div>

      <section className="rounded-2xl bg-[var(--sage)] p-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--primary)]">
          Su propio recorrido
        </p>
        <h2 className="mt-2 text-2xl font-medium">Acompañar, observar y ajustar juntos.</h2>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Los objetivos se acuerdan con la familia y el equipo. No son una
          comparación con otros niños ni una lista de exigencias.
        </p>
      </section>

      {/* Gráfica */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-lg font-semibold">Momentos observados por semana</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Cuántas veces el equipo registró algo positivo ligado a cada objetivo.
          Datos de ejemplo.
        </p>
        <div className="mt-4 h-64 w-full sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekly} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#dde5dd" strokeDasharray="3 3" />
              <XAxis dataKey="semana" tick={{ fontSize: 12, fill: "#60736b" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#60736b" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #dde5dd", fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Expresar" name="Expresar lo que necesita" stroke="#426f5d" strokeWidth={3} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Anticipar" name="Anticipar cambios" stroke="#4d6d83" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Calma" name="Momentos de calma" stroke="#c9a55c" strokeWidth={3} strokeDasharray="2 4" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
{goals.map((g) => (
  <GoalCard
    key={g.title}
    goal={{ ...g, description: g.description.replaceAll("Mateo", child.name) }}
  />
))}
        </div>

        <aside className="grid gap-6">
          <section className="rounded-2xl bg-[var(--blue)] p-6">
            <h2 className="text-lg font-semibold">Próxima revisión conjunta</h2>
            <h3 className="mt-3 font-semibold">30 de octubre de 2026</h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Revisaremos qué apoyos funcionan, qué ha cambiado y qué quiere
              priorizar la familia.
            </p>
            <Link
              href="/calendario"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
            >
              Ver calendario
            </Link>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-semibold">Recursos relacionados</h2>
            <p className="mt-2 text-sm">Secuencia visual para anticipar la salida de casa.</p>
            <Link href="/documentos" className="mt-3 inline-block text-xs font-semibold text-[var(--primary)] hover:underline">
              Consultar documentos →
            </Link>
          </section>

          <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[#74613d]">
            Estos objetivos son ejemplos de contenido para la maqueta, no un
            plan terapéutico individualizado.
          </div>
        </aside>
      </div>
    </div>
  );
}