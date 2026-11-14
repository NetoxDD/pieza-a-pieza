"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import type { ReportData } from "@/lib/report";
import { fmtDuration } from "@/lib/wellbeing";

const th = "border border-black px-2 py-1 text-left font-bold";
const td = "border border-black px-2 py-1 align-top";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 print:break-inside-avoid">
      <h2 className="border-b-2 border-black pb-1 text-lg font-extrabold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function ReportView({
  data,
  onClose,
  onPrint,
}: {
  data: ReportData;
  onClose: () => void;
  onPrint: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Reutiliza el estilo de impresión de la ficha de emergencia: al imprimir, solo sale esta hoja
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.emergency = "open";
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      delete html.dataset.emergency;
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const d = data;
  const inc = d.include;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rep-title"
      className="emergency-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#ffffff] text-[#000000]"
    >
      <div className="mx-auto max-w-3xl p-5 print:p-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={onPrint}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-black px-5 text-base font-bold text-[#ffffff]"
          >
            <Printer size={18} aria-hidden />
            Imprimir o guardar en PDF
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-black px-4 text-base font-bold"
          >
            <X size={18} aria-hidden />
            Cerrar
          </button>
        </div>

        <article>
          <header>
            <h1 id="rep-title" className="text-2xl font-extrabold">
              Informe de seguimiento
            </h1>
            <p className="text-lg font-bold [overflow-wrap:anywhere]">
              {d.childName}
              {d.age ? ` · ${d.age}` : ""}
            </p>
            <p className="text-sm">
              Periodo: {d.fromLabel} al {d.toLabel} ({d.days} días) · Generado el {d.generatedAt}
            </p>
          </header>

          {inc.child && (
            <Section title="Datos del niño">
              <p className="font-bold">Alergias</p>
              {d.allergies.length === 0 ? (
                <p>No hay alergias registradas (puede que no se hayan anotado).</p>
              ) : (
                <ul className="list-disc pl-5">
                  {d.allergies.map((a, i) => (
                    <li key={i}>
                      <strong>{a.substance}</strong> ({a.severity}
                      {a.reaction ? `, ${a.reaction}` : ""})
                    </li>
                  ))}
                </ul>
              )}
              {d.conditions && (
                <>
                  <p className="mt-2 font-bold">Otras condiciones anotadas por la familia</p>
                  <p className="whitespace-pre-wrap">{d.conditions}</p>
                </>
              )}
            </Section>
          )}

          {inc.meds && (
            <Section title="Medicinas actuales">
              {d.meds.length === 0 ? (
                <p>No hay medicinas activas.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Medicina</th>
                      <th className={th}>Dosis anotada</th>
                      <th className={th}>Horario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.meds.map((m, i) => (
                      <tr key={i}>
                        <td className={td}>{m.name}</td>
                        <td className={td}>{m.dose ?? "—"}</td>
                        <td className={td}>{m.schedule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {inc.adherence && (
            <Section title="Registro de tomas">
              {d.adherence.length === 0 && d.prn.length === 0 ? (
                <p>No hay tomas programadas ni registros en este periodo.</p>
              ) : (
                <>
                  {d.adherence.length > 0 && (
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className={th}>Medicina</th>
                          <th className={th}>Tomas programadas</th>
                          <th className={th}>Dadas</th>
                          <th className={th}>Omitidas</th>
                          <th className={th}>Sin registrar</th>
                          <th className={th}>Con posposición</th>
                          <th className={th}>Registros anulados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.adherence.map((r, i) => (
                          <tr key={i}>
                            <td className={td}>{r.name}</td>
                            <td className={td}>{r.scheduled}</td>
                            <td className={td}>{r.given}</td>
                            <td className={td}>{r.omitted}</td>
                            <td className={td}>{r.unrecorded}</td>
                            <td className={td}>{r.postponed}</td>
                            <td className={td}>{r.voided}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <p className="mt-2 text-xs">
                    Calculado con el horario que tenía cada medicina en cada fecha. «Sin registrar» significa que
                    nadie anotó la toma: no quiere decir que no se haya dado.
                  </p>
                  {d.prn.length > 0 && (
                    <>
                      <p className="mt-3 font-bold">Medicinas «solo si es necesario»</p>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className={th}>Medicina</th>
                            <th className={th}>Veces registradas</th>
                            <th className={th}>Últimas dosis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.prn.map((r, i) => (
                            <tr key={i}>
                              <td className={td}>{r.name}</td>
                              <td className={td}>{r.count}</td>
                              <td className={td}>{r.recent.length ? r.recent.join(" · ") : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </>
              )}
            </Section>
          )}

          {inc.mood && (
            <Section title="Estado de ánimo">
              {d.moodTotal === 0 ? (
                <p>No hay registros de ánimo en este periodo.</p>
              ) : (
                <>
                  <p>
                    {d.moodTotal} registros en {d.moodDays} {d.moodDays === 1 ? "día" : "días"}.
                  </p>
                  <ul className="list-disc pl-5">
                    {d.moods
                      .filter((m) => m.n > 0)
                      .map((m) => (
                        <li key={m.label}>
                          {m.label}: {m.n}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </Section>
          )}
                    {inc.wellbeing && (
            <Section title="Sueño y comidas">
              {d.wellbeing.nights === 0 && d.wellbeing.meals.every((m) => m.total === 0) ? (
                <p>No hay registros de sueño ni de comidas en este periodo.</p>
              ) : (
                <>
                  {d.wellbeing.nights > 0 && d.wellbeing.avgMinutes !== null && (
                    <>
                      <p className="font-bold">Sueño</p>
                      <p>
                        {d.wellbeing.nights} {d.wellbeing.nights === 1 ? "noche registrada" : "noches registradas"}.
                        Promedio: {fmtDuration(d.wellbeing.avgMinutes)} y{" "}
                        {(d.wellbeing.avgWakeups ?? 0).toFixed(1)} despertares por noche.
                      </p>
                      <p>
                        {d.wellbeing.quality
                          .filter((q) => q.n > 0)
                          .map((q) => `${q.label}: ${q.n}`)
                          .join(" · ") || "Sin valoración de la noche."}
                      </p>
                    </>
                  )}
                  <p className="mt-3 font-bold">Comidas</p>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={th}>Comida</th>
                        <th className={th}>Nada</th>
                        <th className={th}>Poco</th>
                        <th className={th}>Normal</th>
                        <th className={th}>Mucho</th>
                        <th className={th}>Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.wellbeing.meals.map((m) => (
                        <tr key={m.label}>
                          <td className={td}>{m.label}</td>
                          {m.counts.map((c) => (
                            <td key={c.label} className={td}>
                              {c.n}
                            </td>
                          ))}
                          <td className={td}>{m.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-xs">
                    Solo cuentan los días en que alguien anotó el dato: no registrar no significa que no haya
                    dormido o comido.
                  </p>
                </>
              )}
            </Section>
          )}

          {inc.observations && (
            <Section title="Observaciones elegidas por la familia">
              {d.observations.length === 0 ? (
                <p>No se marcó ninguna observación para el informe.</p>
              ) : (
                <ul className="grid gap-3">
                  {d.observations.map((o, i) => (
                    <li key={i} className="print:break-inside-avoid">
                      <p className="text-xs font-bold">
                        {o.when} · {o.who} · {o.category}
                      </p>
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{o.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {inc.goals && (
            <Section title="Objetivos">
              {d.goals.length === 0 ? (
                <p>No hay objetivos registrados.</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Objetivo</th>
                      <th className={th}>Etapa</th>
                      <th className={th}>Avance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.goals.map((g, i) => (
                      <tr key={i}>
                        <td className={td}>{g.title}</td>
                        <td className={td}>{g.status}</td>
                        <td className={td}>{g.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {inc.notes && (
            <Section title="Notas de las dosis">
              {d.notes.length === 0 ? (
                <p>No hay notas en este periodo.</p>
              ) : (
                <ul className="grid gap-2">
                  {d.notes.map((n, i) => (
                    <li key={i}>
                      <span className="text-xs font-bold">
                        {n.when} · {n.med} · {n.status}:
                      </span>{" "}
                      <span className="[overflow-wrap:anywhere]">{n.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {d.questions.trim() && (
            <Section title="Preguntas para la consulta">
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{d.questions}</p>
            </Section>
          )}

          <p className="mt-8 border-t border-black pt-2 text-xs">
            Este informe lo generó la familia a partir de sus propios registros en Pieza a pieza. No es un
            diagnóstico ni un documento médico, y no sustituye la valoración de un profesional de la salud.
          </p>
        </article>
      </div>
    </div>,
    document.body
  );
}