"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import { useChild } from "@/components/ChildGate";

type Doc = {
  id: number;
  title: string;
  description: string;
  badge: string;
  blue?: boolean;
  author: string;
  date: string;
  sample: boolean;
};

const initialDocs: Doc[] = [
  { id: 1, title: "Secuencia visual · Salir de casa", description: "Pasos visuales para anticipar la salida y ofrecer opciones conocidas.", badge: "Apoyo visual", author: "Ana Ruiz · Logopeda", date: "23 oct 2026", sample: true },
  { id: 2, title: "Plan de objetivos y apoyos", description: "Objetivos compartidos, apoyos acordados y aspectos que estamos observando.", badge: "Plan compartido", blue: true, author: "Familia y equipo", date: "23 oct 2026", sample: true },
  { id: 3, title: "Preferencias y momentos de calma", description: "Intereses, señales y recursos que ayudan a acompañar a Mateo.", badge: "Bienestar", author: "Lucía Martín · Terapeuta ocupacional", date: "23 oct 2026", sample: true },
];

export default function Documentos() {
  const [docs, setDocs] = useState(initialDocs);
  const [dragging, setDragging] = useState(false);
  const { child } = useChild();

  const addFile = (file: File | undefined) => {
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    setDocs((d) => [
      {
        id: Date.now(),
        title: file.name,
        description: `Archivo de prueba · ${kb} KB. No se sube a ningún servidor.`,
        badge: "Nuevo",
        blue: true,
        author: "Clara López · Familia",
        date: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
        sample: false,
      },
      ...d,
    ]);
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos y recursos</h1>
        <p className="mt-1 text-[var(--muted)]">
          Apoyos visuales y acuerdos del equipo, en un mismo lugar.
        </p>
      </div>

      <section className="rounded-2xl bg-[var(--sage)] p-6">
        <p className="text-[0.625rem] font-bold uppercase tracking-widest text-[var(--primary)]">
          Materiales compartidos
        </p>
        <h2 className="mt-2 text-2xl font-medium">Lo que nos ayuda, a mano.</h2>
        <p className="mt-2 max-w-3xl text-[var(--muted)]">
          Estas tarjetas son ejemplos. No hay documentos reales adjuntos ni descargas disponibles.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {docs.map((d) => (
          <article key={d.id} className="flex flex-col items-start rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <span className="mb-5 grid h-14 w-12 place-items-center rounded-lg border border-[var(--border)] bg-[var(--sage)] text-[var(--primary)]">
              <FileText size={22} aria-hidden />
            </span>
            <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{d.title}</h2>
            <p className="mt-2 text-sm">{d.description.replaceAll("Mateo", child.name)}</p>
            <span
              className={`mt-3 inline-block rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold ${
                d.blue ? "bg-[var(--blue)] text-[var(--blue-text)]" : "bg-[var(--sage)] text-[var(--primary)]"
              }`}
            >
              {d.badge}
            </span>
            <div className="my-4 text-xs text-[var(--muted)]">
              <strong className="block text-[var(--text)]">{d.author}</strong>
              {d.date} · {d.sample ? "Documento de ejemplo" : "Archivo de prueba"}
            </div>

            {d.id === 2 ? (
              <Link
                href="/objetivos"
                className="mt-auto inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                Consultar en la aplicación
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="mt-auto min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] opacity-55"
              >
                Descargar PDF
              </button>
            )}
          </article>
        ))}
      </div>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-[var(--primary)] bg-[var(--sage)]" : "border-[var(--border)]"
        }`}
      >
        <h2 className="text-lg font-semibold">Compartir un documento</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Arrastra un archivo aquí o selecciónalo. Es una prueba: no se guarda. No uses
          información personal o clínica real.
        </p>
        <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] focus-within:outline focus-within:outline-3 focus-within:outline-offset-4 focus-within:outline-[var(--blue-text)]">
          <Upload size={16} aria-hidden />
          Seleccionar documento
          <input
            type="file"
            className="sr-only"
            onChange={(e) => {
              addFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </section>
    </div>
  );
}