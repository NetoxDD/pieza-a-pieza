"use client";

import { useState } from "react";
import { FileText, Link2, ListChecks, Lock, Pin, ThumbsUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Avatar from "@/components/Avatar";
import { roleLabel } from "@/lib/roles";
import type { PublicProfile } from "@/lib/profile";
import { CATEGORIES, categoryLabel, domainOf, kindLabel, normalizeUrl, type Material } from "@/lib/material";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
const area = "rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal";
const KIND_ICON = { archivo: FileText, enlace: Link2, actividad: ListChecks };

export default function MaterialItem({
  m,
  thumbUrl,
  author,
  userId,
  isFamily,
  likeCount,
  liked,
  highlight,
  onChanged,
}: {
  m: Material;
  thumbUrl?: string;
  author?: PublicProfile;
  userId: string;
  isFamily: boolean;
  likeCount: number;
  liked: boolean;
  highlight: boolean;
  onChanged: () => void;
}) {
  const isAuthor = m.author_id === userId;
  const Icon = KIND_ICON[m.kind];
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    audience: "todos" as "todos" | "familia",
    url: "",
    steps: "",
    duration: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [readyUrl, setReadyUrl] = useState("");

  const startEdit = () => {
    setForm({
      title: m.title,
      description: m.description ?? "",
      category: m.category,
      audience: m.audience,
      url: m.url ?? "",
      steps: m.steps ?? "",
      duration: m.duration_min ? String(m.duration_min) : "",
    });
    setMsg("");
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const patch: Record<string, unknown> = {
      title,
      description: form.description.trim() || null,
      category: form.category,
      audience: form.audience,
    };
    if (m.kind === "enlace") {
      const u = normalizeUrl(form.url);
      if (!u) {
        setMsg("Escribe una dirección web válida que empiece con https://");
        return;
      }
      patch.url = u;
    }
    if (m.kind === "actividad") {
      if (!form.steps.trim()) {
        setMsg("Escribe los pasos de la actividad.");
        return;
      }
      patch.steps = form.steps.trim();
      patch.duration_min = form.duration ? Number(form.duration) : null;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.from("materials").update(patch).eq("id", m.id).select("id");
    setBusy(false);
    if (error || !data?.length) {
      setMsg("No se pudo guardar. Revisa tus permisos e intenta de nuevo.");
      return;
    }
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`¿Eliminar "${m.title}"? No se puede deshacer.`)) return;
    setBusy(true);
    // Primero el registro (se corta el acceso) y después el archivo
    const { data, error } = await supabase.from("materials").delete().eq("id", m.id).select("id");
    if (error || !data?.length) {
      setBusy(false);
      setMsg("No se pudo eliminar.");
      return;
    }
    const paths = [m.storage_path, m.thumb_path].filter((p): p is string => !!p);
    if (paths.length > 0) await supabase.storage.from("materials").remove(paths);
    setBusy(false);
    onChanged();
  };

  const toggleLike = async () => {
    const result = liked
      ? await supabase.from("material_likes").delete().eq("material_id", m.id).eq("user_id", userId)
      : await supabase.from("material_likes").insert({ material_id: m.id });
    if (result.error) setMsg("No se pudo guardar tu respuesta.");
    onChanged();
  };

  const togglePin = async () => {
    setMsg("");
    const { error } = await supabase.rpc("pin_material", { mid: m.id, pin: !m.pinned });
    if (error) setMsg(error.message);
    else onChanged();
  };

  const openFile = async () => {
    if (!m.storage_path) return;
    setMsg("");
    setReadyUrl("");
    const { data, error } = await supabase.storage.from("materials").createSignedUrl(m.storage_path, 300);
    if (error || !data) {
      setMsg("No se pudo abrir el archivo.");
      return;
    }
    const w = window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    if (!w) setReadyUrl(data.signedUrl);
  };

  const stepsList = m.steps ? m.steps.split("\n").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <li
      id={`m-${m.id}`}
      className={`rounded-2xl border bg-[var(--surface)] p-6 ${
        highlight ? "border-[var(--primary)] ring-2 ring-[var(--primary)]" : "border-[var(--border)]"
      }`}
    >
      <div className="flex items-start gap-4">
        {m.kind === "archivo" && thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-[var(--primary)]">
            <Icon size={22} aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">{m.title}</h2>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-[var(--sage)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--primary)]">
              {kindLabel[m.kind]}
              {m.kind === "actividad" && m.duration_min ? ` · ${m.duration_min} min` : ""}
            </span>
            <span className="rounded-md bg-[var(--blue)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--blue-text)]">
              {categoryLabel[m.category] ?? m.category}
            </span>
            {m.audience === "familia" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--sand)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--sand-text)]">
                <Lock size={11} aria-hidden />
                Solo la familia
              </span>
            )}
            {m.pinned && (
              <span className="inline-flex items-center gap-1 rounded-md bg-[var(--primary)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--on-primary)]">
                <Pin size={11} aria-hidden />
                Fijada en Inicio
              </span>
            )}
          </div>
        </div>
      </div>

      {m.description && <p className="mt-3 text-sm [overflow-wrap:anywhere]">{m.description}</p>}

      {m.kind === "actividad" && stepsList.length > 0 && (
        <ol className="mt-3 list-decimal pl-5 text-sm">
          {stepsList.map((s, i) => (
            <li key={i} className="mt-1 [overflow-wrap:anywhere]">
              {s}
            </li>
          ))}
        </ol>
      )}

      {m.kind === "enlace" && m.url && (
        <p className="mt-3 text-sm">
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-4 font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            <Link2 size={16} aria-hidden />
            Abrir {domainOf(m.url)}
          </a>
          <span className="mt-1 block text-xs text-[var(--muted)]">
            Es un sitio externo: no controlamos su contenido.
          </span>
        </p>
      )}

      {m.kind === "archivo" && (
        <p className="mt-3">
          <button
            type="button"
            onClick={openFile}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            Abrir {m.mime === "application/pdf" ? "PDF" : "imagen"}
          </button>
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted)]">
        <Avatar profile={author} name={author?.name ?? "?"} size={24} />
        <span className="min-w-0 [overflow-wrap:anywhere]">
          {author?.name ?? "Alguien del equipo"}
          {author?.role ? ` · ${roleLabel[author.role] ?? author.role}` : ""} ·{" "}
          {new Date(m.created_at).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
            liked
              ? "border-[var(--primary)] bg-[var(--sage)] text-[var(--primary)]"
              : "border-[var(--border)] hover:bg-[var(--sage)]"
          }`}
        >
          <ThumbsUp size={16} aria-hidden />
          Me sirvió{likeCount > 0 ? ` (${likeCount})` : ""}
        </button>

        {isFamily && (
          <button
            type="button"
            onClick={togglePin}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            {m.pinned ? "Quitar de Inicio" : "Fijar en Inicio"}
          </button>
        )}
        {isAuthor && !editing && (
          <button
            type="button"
            onClick={startEdit}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
          >
            Editar
          </button>
        )}
        {(isAuthor || isFamily) && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
          >
            Eliminar
          </button>
        )}
      </div>

      {editing && (
        <form onSubmit={save} className="mt-3 grid gap-4 rounded-xl bg-[var(--background)] p-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Título
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={120}
              required
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Descripción (opcional)
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={600}
              rows={3}
              className={area}
            />
          </label>
          {m.kind === "enlace" && (
            <label className="grid gap-1.5 text-xs font-semibold">
              Dirección web
              <input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                maxLength={500}
                className={input}
              />
            </label>
          )}
          {m.kind === "actividad" && (
            <>
              <label className="grid gap-1.5 text-xs font-semibold">
                Pasos (uno por línea)
                <textarea
                  value={form.steps}
                  onChange={(e) => setForm({ ...form, steps: e.target.value })}
                  maxLength={1500}
                  rows={5}
                  className={area}
                />
              </label>
              <label className="grid max-w-40 gap-1.5 text-xs font-semibold">
                Duración en minutos
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className={input}
                />
              </label>
            </>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-semibold">
              Categoría
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={input}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold">
              ¿Quién puede verlo?
              <select
                value={form.audience}
                onChange={(e) => setForm({ ...form, audience: e.target.value as "todos" | "familia" })}
                className={input}
              >
                <option value="todos">Todo el equipo</option>
                <option value="familia">Solo la familia</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy || !form.title.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {readyUrl && (
        <p role="status" className="mt-3 rounded-xl bg-[var(--blue)] p-3 text-sm">
          Tu navegador bloqueó la ventana nueva.{" "}
          <a href={readyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Abrir el archivo
          </a>{" "}
          (el enlace dura 5 minutos).
        </p>
      )}

      {msg && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </li>
  );
}