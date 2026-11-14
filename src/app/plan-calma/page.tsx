"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { CALM_COLS, CALM_KINDS, MAX_ITEMS, type CalmItem, type CalmKind } from "@/lib/calm";

const sync = () => window.dispatchEvent(new Event("pap:calm-sync"));

const inputCls =
  "min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const primary =
  "min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50";
const small =
  "min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)] disabled:opacity-40";

const section = "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6";

export default function PlanCalma() {
  const { child, role } = useChild();
  const { contacts } = useChildProfile();
  const isFamily = role === "familia";

  const [items, setItems] = useState<CalmItem[]>([]);
  const [inEmergency, setInEmergency] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    const [it, st] = await Promise.all([
      supabase
        .from("calm_plan_items")
        .select(CALM_COLS)
        .eq("child_id", child.id)
        .order("position")
        .order("created_at"),
      supabase.from("calm_plan_settings").select("in_emergency").eq("child_id", child.id).maybeSingle(),
    ]);
    if (it.error || st.error) {
      setError("No se pudo cargar el plan.");
    } else {
      setError("");
      setItems(it.data as CalmItem[]);
      setInEmergency(!!st.data?.in_emergency);
    }
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const done = (ok: boolean, text: string) => {
    setBusy(false);
    if (!ok) {
      setError(text);
      return;
    }
    setError("");
    sync();
    load();
  };

  const add = async (kind: CalmKind) => {
    const body = (drafts[kind] ?? "").trim();
    if (!body) return;
    setBusy(true);
    const { error } = await supabase.from("calm_plan_items").insert({ child_id: child.id, kind, body });
    if (!error) setDrafts((d) => ({ ...d, [kind]: "" }));
    done(!error, error?.message?.startsWith("Cada sección") ? error.message : "No se pudo añadir.");
  };

  const saveEdit = async (it: CalmItem) => {
    const body = editText.trim();
    if (!body) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("calm_plan_items")
      .update({ body })
      .eq("id", it.id)
      .select("id");
    if (!error && data?.length) setEditing(null);
    done(!error && !!data?.length, "No se pudo guardar.");
  };

  const remove = async (it: CalmItem) => {
    if (!window.confirm("¿Quitar este elemento?")) return;
    setBusy(true);
    const { data, error } = await supabase.from("calm_plan_items").delete().eq("id", it.id).select("id");
    done(!error && !!data?.length, "No se pudo quitar.");
  };

  const move = async (it: CalmItem, dir: -1 | 1) => {
    const mine = items.filter((x) => x.kind === it.kind);
    const i = mine.findIndex((x) => x.id === it.id);
    const other = mine[i + dir];
    if (!other) return;
    setBusy(true);
    const a = await supabase.from("calm_plan_items").update({ position: other.position }).eq("id", it.id).select("id");
    const b = await supabase.from("calm_plan_items").update({ position: it.position }).eq("id", other.id).select("id");
    done(!a.error && !b.error && !!a.data?.length && !!b.data?.length, "No se pudo reordenar.");
  };

  const toggleEmergency = async (value: boolean) => {
    setBusy(true);
    const upd = await supabase
      .from("calm_plan_settings")
      .update({ in_emergency: value })
      .eq("child_id", child.id)
      .select("child_id");
    let ok = !upd.error;
    if (ok && !upd.data?.length) {
      const ins = await supabase.from("calm_plan_settings").insert({ child_id: child.id, in_emergency: value });
      ok = !ins.error;
    }
    done(ok, "No se pudo guardar el cambio.");
  };

  const emergencyContacts = contacts.filter((c) => c.is_emergency);
  const total = items.length;

  const renderKind = (k: (typeof CALM_KINDS)[number]) => {
    const mine = items.filter((x) => x.kind === k.key);
    if (!isFamily && mine.length === 0) return null;
    const List = k.ordered ? "ol" : "ul";

    return (
      <section key={k.key} className={section} aria-labelledby={`k-${k.key}`}>
        <h2 id={`k-${k.key}`} className="text-lg font-semibold">
          {k.title}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{k.hint}</p>

        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Todavía no hay nada aquí.</p>
        ) : (
          <List className={`mt-3 grid gap-2 pl-6 ${k.ordered ? "list-decimal" : "list-disc"}`}>
            {mine.map((it, idx) => (
              <li key={it.id} className="text-base [overflow-wrap:anywhere]">
                {editing === it.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={200}
                      aria-label="Texto del elemento"
                      className={`${inputCls} max-w-md`}
                    />
                    <button type="button" onClick={() => saveEdit(it)} disabled={busy || !editText.trim()} className={primary}>
                      Guardar
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={small}>
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span>{it.body}</span>
                    {isFamily && (
                      <span className="flex flex-wrap">
                        <button
                          type="button"
                          onClick={() => move(it, -1)}
                          disabled={busy || idx === 0}
                          aria-label={`Subir: ${it.body}`}
                          className={small}
                        >
                          <ArrowUp size={14} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(it, 1)}
                          disabled={busy || idx === mine.length - 1}
                          aria-label={`Bajar: ${it.body}`}
                          className={small}
                        >
                          <ArrowDown size={14} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(it.id);
                            setEditText(it.body);
                          }}
                          className={small}
                        >
                          Editar
                        </button>
                        <button type="button" onClick={() => remove(it)} disabled={busy} className={small}>
                          Quitar
                        </button>
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </List>
        )}

        {isFamily && mine.length < MAX_ITEMS && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(k.key);
            }}
            className="mt-4 flex flex-wrap items-end gap-2"
          >
            <label className="grid min-w-0 flex-1 gap-1.5 text-xs font-semibold">
              Añadir
              <input
                value={drafts[k.key] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [k.key]: e.target.value }))}
                maxLength={200}
                placeholder={k.placeholder}
                className={inputCls}
              />
            </label>
            <button type="submit" disabled={busy || !(drafts[k.key] ?? "").trim()} className={primary}>
              Añadir
            </button>
          </form>
        )}
        {isFamily && mine.length >= MAX_ITEMS && (
          <p className="mt-3 text-xs text-[var(--muted)]">Llegaste al máximo de {MAX_ITEMS} elementos.</p>
        )}
      </section>
    );
  };

  const calls = (
    <section key="calls" className={section} aria-labelledby="k-calls">
      <h2 id="k-calls" className="text-lg font-semibold">
        A quién llamar
      </h2>
      {emergencyContacts.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">
          No hay contactos de emergencia registrados.{" "}
          {isFamily && (
            <Link href="/ficha" className="font-semibold text-[var(--primary)] hover:underline">
              Añádelos en la Ficha →
            </Link>
          )}
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {emergencyContacts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                <strong>{c.name}</strong>
                {c.relation && <span className="text-[var(--muted)]"> ({c.relation})</span>}
              </span>
              {c.phone && (
                <a
                  href={`tel:${c.phone}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)]"
                >
                  <Phone size={16} aria-hidden />
                  Llamar {c.phone}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  // Orden de lectura en un momento difícil: señales, qué ayuda, qué evitar, cuándo pedir ayuda, a quién llamar, y al final los detonantes
  const order = ["senal", "ayuda", "evitar", "pedir_ayuda"].map((k) => CALM_KINDS.find((x) => x.key === k)!);
  const detonantes = CALM_KINDS.find((x) => x.key === "detonante")!;

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Plan de calma de {child.name}</h1>
        <p className="mt-1 text-[var(--muted)]">
          Una guía breve para quien acompañe a {child.name} cuando se sienta mal. Está escrita por la familia
          y no sustituye las indicaciones de un profesional.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && total === 0 && !isFamily && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          La familia todavía no ha escrito el plan de calma.
        </p>
      )}

      {isFamily && (
        <section className={section}>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={inEmergency}
              disabled={busy}
              onChange={(e) => toggleEmergency(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
            />
            <span>
              <strong>Mostrar este plan en la ficha de emergencia.</strong>
              <span className="mt-1 block text-[var(--muted)]">
                Lo verá cualquiera del equipo que abra la ficha, y se guarda en la copia sin conexión de cada
                dispositivo que la tenga activada.
              </span>
            </span>
          </label>
        </section>
      )}

      {!loading && (
        <>
          {order.map(renderKind)}
          {calls}
          {renderKind(detonantes)}
        </>
      )}
    </div>
  );
}