"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
   import { groupCalm } from "@/lib/calm";
import { AlertTriangle, MapPin, Phone, Printer, X } from "lucide-react";
import {
  ageText,
  allergyKindLabel,
  contactKindLabel,
  mapsUrl,
  medCategoryLabel,
} from "@/lib/ficha";
import type { EmergencySnapshot } from "@/lib/emergency";

const sevRank: Record<string, number> = { grave: 0, moderada: 1, leve: 2 };
const sevLabel: Record<string, string> = { grave: "GRAVE", moderada: "Moderada", leve: "Leve" };

type Contact = EmergencySnapshot["contacts"][number];

function ContactCard({ c }: { c: Contact }) {
  return (
    <li className="grid gap-2 rounded-xl border-2 border-black p-4">
      <p className="text-lg font-bold [overflow-wrap:anywhere]">
        {c.name}
        {c.relation && <span className="font-normal"> ({c.relation})</span>}
      </p>
      <p className="text-sm">{contactKindLabel[c.kind] ?? c.kind}</p>
      <div className="flex flex-wrap gap-2">
        {c.phone && (
          <a
            href={`tel:${c.phone}`}
            className="flex min-h-14 items-center gap-3 rounded-xl bg-black px-5 text-lg font-bold text-[#ffffff]"
          >
            <Phone size={20} aria-hidden />
            Llamar {c.phone}
          </a>
        )}
        {c.address && (
          <a
            href={mapsUrl(c.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-14 items-center gap-3 rounded-xl border-2 border-black px-5 text-base font-bold"
          >
            <MapPin size={20} aria-hidden />
            Mapa
          </a>
        )}
      </div>
      {c.address && <p className="text-sm [overflow-wrap:anywhere]">{c.address}</p>}
    </li>
  );
}

export default function EmergencyView({
  snap,
  source,
  onClose,
  onPrint,
}: {
  snap: EmergencySnapshot | null;
  source: "live" | "cache";
  onClose: () => void;
  onPrint?: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const [inc, setInc] = useState({
    allergies: true,
    emergency: true,
    doctors: false,
    meds: false,
    conditions: false,
    calm: true,
  });

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.emergency = "open";
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      delete html.dataset.emergency;
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const allergies = snap ? snap.allergies.slice().sort((a, b) => sevRank[a.severity] - sevRank[b.severity]) : [];
  const emergencyContacts = snap ? snap.contacts.filter((c) => c.isEmergency) : [];
  const doctors = snap
    ? snap.contacts.filter((c) => !c.isEmergency && (c.kind === "pediatra" || c.kind === "hospital"))
    : [];
  const hasMeds = !!snap?.meds && snap.meds.length > 0;
  const hasConditions = !!snap?.conditions.text;
     const calmGroups = groupCalm(snap?.calm);
   const hasCalm = calmGroups.length > 0;
  const limited = !!snap && (snap.meds === null || !snap.conditions.visible);

  const age = snap ? ageText(snap.birthDate) : "";
  const when = snap
    ? new Date(snap.savedAt).toLocaleString("es-MX", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const print = () => {
    onPrint?.();
    window.print();
  };

  const check = (key: keyof typeof inc, label: string, disabled = false) => (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
      <input
        type="checkbox"
        checked={inc[key] && !disabled}
        disabled={disabled}
        onChange={(e) => setInc({ ...inc, [key]: e.target.checked })}
        className="h-5 w-5 shrink-0 accent-black"
      />
      {label}
    </label>
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emg-title"
      className="emergency-overlay fixed inset-0 z-[70] overflow-y-auto bg-[#ffffff] text-[#000000]"
    >
      {/* ===== Pantalla ===== */}
      <div className="mx-auto grid max-w-2xl gap-6 p-5 print:hidden">
        <div className="flex items-start justify-between gap-3">
          <h1 id="emg-title" className="text-3xl font-extrabold tracking-tight">
            Ficha de emergencia
          </h1>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex min-h-14 shrink-0 items-center gap-2 rounded-xl border-2 border-black px-4 text-base font-bold"
          >
            <X size={20} aria-hidden />
            Cerrar
          </button>
        </div>

        {!snap ? (
          <p className="rounded-xl border-2 border-black p-5 text-lg">
            No se pudo cargar la ficha y no hay una copia guardada en este dispositivo. Si hay peligro,
            llama primero a los servicios de emergencia.
          </p>
        ) : (
          <>
            {source === "cache" && (
              <p role="status" className="rounded-xl border-2 border-black bg-[#fff3b0] p-4 text-base font-bold">
                Sin conexión. Datos guardados el {when}. Pueden estar desactualizados.
              </p>
            )}

            <div>
              <p className="text-4xl font-extrabold [overflow-wrap:anywhere]">{snap.childName}</p>
              <p className="mt-1 text-xl">
                {[age, snap.bloodType && `Grupo sanguíneo ${snap.bloodType}`].filter(Boolean).join(" · ") ||
                  "Sin edad ni grupo sanguíneo registrados"}
              </p>
            </div>

            {snap.emergencyNumber ? (
              <a
                href={`tel:${snap.emergencyNumber}`}
                className="flex min-h-16 items-center justify-center gap-3 rounded-xl bg-[#b00020] px-5 text-xl font-extrabold text-[#ffffff]"
              >
                <Phone size={24} aria-hidden />
                Llamar a emergencias: {snap.emergencyNumber}
              </a>
            ) : (
              <p className="rounded-xl border-2 border-black p-4 text-base">
                La familia no ha registrado el número de emergencias local. Si hay peligro, llama a los
                servicios de emergencia de tu zona.
              </p>
            )}

            <section aria-labelledby="emg-allergies" className="rounded-xl border-4 border-[#b00020] p-5">
              <h2 id="emg-allergies" className="flex items-center gap-2 text-2xl font-extrabold text-[#b00020]">
                <AlertTriangle size={26} aria-hidden />
                Alergias
              </h2>
              {allergies.length === 0 ? (
                <p className="mt-2 text-lg">
                  No hay alergias registradas. Puede que la familia no las haya anotado todavía.
                </p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {allergies.map((a, i) => (
                    <li key={i} className="text-lg">
                      <strong className="text-xl [overflow-wrap:anywhere]">{a.substance}</strong>{" "}
                      <span
                        className={`rounded px-2 py-0.5 text-sm font-extrabold ${
                          a.severity === "grave" ? "bg-[#b00020] text-[#ffffff]" : "border border-black"
                        }`}
                      >
                        {sevLabel[a.severity] ?? a.severity}
                      </span>
                      <span className="block text-base">
                        {allergyKindLabel[a.kind] ?? a.kind}
                        {a.reaction ? ` · ${a.reaction}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="emg-contacts">
              <h2 id="emg-contacts" className="text-2xl font-extrabold">
                Contactos de emergencia
              </h2>
              {emergencyContacts.length === 0 ? (
                <p className="mt-2 text-lg">No hay contactos de emergencia registrados.</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {emergencyContacts.map((c, i) => (
                    <ContactCard key={i} c={c} />
                  ))}
                </ul>
              )}
            </section>

            {hasMeds && (
              <section aria-labelledby="emg-meds">
                <h2 id="emg-meds" className="text-2xl font-extrabold">
                  Medicamentos actuales
                </h2>
                <ul className="mt-3 grid gap-2">
                  {snap.meds!.map((m, i) => (
                    <li key={i} className="rounded-xl border-2 border-black p-4 text-lg">
                      <strong className="[overflow-wrap:anywhere]">{m.name}</strong>
                      <span className="block text-base">
                        {[m.dose, m.frequency, medCategoryLabel[m.category]].filter(Boolean).join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {hasConditions && (
              <section aria-labelledby="emg-cond">
                <h2 id="emg-cond" className="text-2xl font-extrabold">
                  Otras condiciones
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-lg [overflow-wrap:anywhere]">
                  {snap.conditions.text}
                </p>
              </section>
            )}

            {doctors.length > 0 && (
              <section aria-labelledby="emg-doctors">
                <h2 id="emg-doctors" className="text-2xl font-extrabold">
                  Pediatra y hospital
                </h2>
                <ul className="mt-3 grid gap-3">
                  {doctors.map((c, i) => (
                    <ContactCard key={i} c={c} />
                  ))}
                </ul>
              </section>
            )}

                        {hasCalm && (
              <section aria-labelledby="emg-calm">
                <h2 id="emg-calm" className="text-2xl font-extrabold">
                  Plan de calma
                </h2>
                <div className="mt-3 grid gap-3">
                  {calmGroups.map((g) => (
                    <div key={g.kind} className="rounded-xl border-2 border-black p-4">
                      <h3 className="text-lg font-extrabold">{g.title}</h3>
                      {g.ordered ? (
                        <ol className="mt-2 grid list-decimal gap-1 pl-6 text-lg">
                          {g.items.map((t, i) => (
                            <li key={i} className="[overflow-wrap:anywhere]">
                              {t}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <ul className="mt-2 grid list-disc gap-1 pl-6 text-lg">
                          {g.items.map((t, i) => (
                            <li key={i} className="[overflow-wrap:anywhere]">
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {limited && (
              <p className="text-sm">
                Es posible que haya más información que tu rol no puede ver en esta ficha.
              </p>
            )}

            <section className="grid gap-2 rounded-xl border-2 border-black p-4">
              <h2 className="text-lg font-extrabold">Tarjeta imprimible</h2>
              <p className="text-sm">Elige qué incluir. Por defecto, solo alergias y contactos de emergencia.</p>
              {check("allergies", "Alergias")}
              {check("emergency", "Contactos de emergencia")}
              {check("doctors", "Pediatra y hospital", doctors.length === 0)}
              {check("meds", "Medicamentos", !hasMeds)}
              {check("conditions", "Otras condiciones", !hasConditions)}
                 {hasCalm && check("calm", "Plan de calma")}
              <button
                type="button"
                onClick={print}
                className="mt-2 flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-black px-5 text-base font-bold"
              >
                <Printer size={20} aria-hidden />
                Imprimir o guardar en PDF
              </button>
            </section>

            <p className="text-sm">
              Esta ficha la escribe la familia y no sustituye la atención médica. La app no llama a los
              servicios de emergencia por sí sola: los botones usan los números que la familia registró.
            </p>
          </>
        )}
      </div>

      {/* ===== Versión impresa: sencilla, blanco y negro ===== */}
      {snap && (
        <div className="hidden p-6 print:block">
          <h1 style={{ fontSize: "22pt", fontWeight: 800 }}>FICHA DE EMERGENCIA</h1>
          <p style={{ fontSize: "16pt", fontWeight: 700 }}>{snap.childName}</p>
          <p style={{ fontSize: "11pt" }}>
            {[age, snap.bloodType && `Grupo sanguíneo ${snap.bloodType}`].filter(Boolean).join(" · ")}
          </p>
          {snap.emergencyNumber && (
            <p style={{ fontSize: "12pt", fontWeight: 700 }}>Número de emergencias: {snap.emergencyNumber}</p>
          )}

          {inc.allergies && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>ALERGIAS</h2>
              {allergies.length === 0 ? (
                <p style={{ fontSize: "11pt" }}>No hay alergias registradas.</p>
              ) : (
                <ul style={{ fontSize: "11pt", paddingLeft: "16pt", listStyle: "disc" }}>
                  {allergies.map((a, i) => (
                    <li key={i}>
                      <strong>{a.substance}</strong> ({sevLabel[a.severity] ?? a.severity}
                      {a.reaction ? `, ${a.reaction}` : ""})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {inc.emergency && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>CONTACTOS DE EMERGENCIA</h2>
              <ul style={{ fontSize: "11pt", paddingLeft: "16pt", listStyle: "disc" }}>
                {emergencyContacts.map((c, i) => (
                  <li key={i}>
                    <strong>{c.name}</strong>
                    {c.relation ? ` (${c.relation})` : ""}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inc.doctors && doctors.length > 0 && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>PEDIATRA Y HOSPITAL</h2>
              <ul style={{ fontSize: "11pt", paddingLeft: "16pt", listStyle: "disc" }}>
                {doctors.map((c, i) => (
                  <li key={i}>
                    <strong>{c.name}</strong>
                    {c.phone ? ` · ${c.phone}` : ""}
                    {c.address ? ` · ${c.address}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inc.meds && hasMeds && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>MEDICAMENTOS ACTUALES</h2>
              <ul style={{ fontSize: "11pt", paddingLeft: "16pt", listStyle: "disc" }}>
                {snap.meds!.map((m, i) => (
                  <li key={i}>
                    <strong>{m.name}</strong>
                    {[m.dose, m.frequency].filter(Boolean).length > 0
                      ? ` · ${[m.dose, m.frequency].filter(Boolean).join(" · ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inc.conditions && hasConditions && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>OTRAS CONDICIONES</h2>
              <p style={{ fontSize: "11pt", whiteSpace: "pre-wrap" }}>{snap.conditions.text}</p>
            </div>
          )}

                    {inc.calm && hasCalm && (
            <div style={{ marginTop: "12pt" }}>
              <h2 style={{ fontSize: "14pt", fontWeight: 800 }}>PLAN DE CALMA</h2>
              {calmGroups.map((g) => (
                <div key={g.kind} style={{ marginTop: "6pt" }}>
                  <p style={{ fontSize: "11pt", fontWeight: 700 }}>{g.title}</p>
                  <ul
                    style={{
                      fontSize: "11pt",
                      paddingLeft: "16pt",
                      listStyle: g.ordered ? "decimal" : "disc",
                    }}
                  >
                    {g.items.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <p style={{ marginTop: "18pt", fontSize: "9pt" }}>
            Datos escritos por la familia, actualizados al {when}. No sustituyen la atención médica.
            Impreso desde Pieza a pieza.
          </p>
        </div>
      )}
    </div>,
    document.body
  );
}