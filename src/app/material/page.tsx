"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import PublishForm from "@/components/material/PublishForm";
import MaterialItem from "@/components/material/MaterialItem";
import { CATEGORIES, PUBLISH_ROLES, type Material } from "@/lib/material";

export default function MaterialPage() {
  const { child, role, userId } = useChild();
  const { get } = useProfiles();
  const canPublish = PUBLISH_ROLES.includes(role);
  const isFamily = role === "familia";

  const [items, setItems] = useState<Material[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("todas");
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [highlight, setHighlight] = useState("");
  const [goals, setGoals] = useState<{ id: string; title: string }[]>([]);

  const load = useCallback(async () => {
    const mat = await supabase
      .from("materials")
      .select(
"id,author_id,kind,title,description,category,audience,url,steps,duration_min,mime,size_bytes,storage_path,thumb_path,pinned,goal_id,created_at"      )
      .eq("child_id", child.id)
      .order("created_at", { ascending: false });

    if (mat.error) {
      setError("No se pudo cargar el material de apoyo.");
      setLoading(false);
      return;
    }

    const list = mat.data as Material[];
    const g = await supabase.from("goals").select("id,title").eq("child_id", child.id).order("created_at");
    const ids = list.map((x) => x.id);

    let likes: { material_id: string; user_id: string }[] = [];
    if (ids.length > 0) {
      const r = await supabase.from("material_likes").select("material_id,user_id").in("material_id", ids);
      if (!r.error) likes = r.data;
    }
    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    likes.forEach((l) => {
      counts[l.material_id] = (counts[l.material_id] ?? 0) + 1;
      if (l.user_id === userId) mine.add(l.material_id);
    });

    const paths = list.map((x) => x.thumb_path).filter((p): p is string => !!p);
    const map: Record<string, string> = {};
    if (paths.length > 0) {
      const { data } = await supabase.storage.from("materials").createSignedUrls(paths, 3600);
      data?.forEach((x) => {
        if (x.path && x.signedUrl) map[x.path] = x.signedUrl;
      });
    }

    setItems(list);
    setLikeCounts(counts);
    setMyLikes(mine);
    setThumbs(map);
    setGoals((g.data ?? []) as { id: string; title: string }[]);
    setError("");
    setLoading(false);
  }, [child.id, userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Si se llega desde Inicio con #m-<id>, se baja hasta esa publicación
  useEffect(() => {
    if (loading) return;
    const h = window.location.hash;
    if (h.startsWith("#m-")) {
      setHighlight(h.slice(3));
      document.getElementById(h.slice(1))?.scrollIntoView({ block: "center" });
    }
  }, [loading]);

  const shown = items
    .filter((x) => category === "todas" || x.category === category)
    .filter((x) => !onlyLiked || myLikes.has(x.id))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const chip = (active: boolean) =>
    `min-h-11 rounded-full border px-4 text-sm transition ${
      active
        ? "border-[var(--primary)] bg-[var(--sage)] font-bold text-[var(--primary)]"
        : "border-[var(--border)] hover:bg-[var(--sage)]"
    }`;

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Material de apoyo</h1>
          <p className="mt-1 text-[var(--muted)]">
            Actividades, enlaces y archivos que ayudan a acompañar a {child.name}.
          </p>
        </div>
        {canPublish && (
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="min-h-11 shrink-0 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
          >
            + Publicar
          </button>
        )}
      </div>

      {showForm && canPublish && (
        <PublishForm goals={goals}
          onCancel={() => setShowForm(false)}
          onDone={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

      {!loading && items.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          <button type="button" onClick={() => setCategory("todas")} aria-pressed={category === "todas"} className={chip(category === "todas")}>
            Todas
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              className={chip(category === c.value)}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyLiked((v) => !v)}
            aria-pressed={onlyLiked}
            className={chip(onlyLiked)}
          >
            Los que me sirvieron
          </button>
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          Todavía no hay material.{" "}
          {canPublish
            ? "Publica la primera actividad, enlace o archivo con el botón «+ Publicar»."
            : "Cuando la familia o los profesionales publiquen algo, aparecerá aquí."}
        </p>
      )}

      {!loading && items.length > 0 && shown.length === 0 && (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
          No hay publicaciones con esos filtros.
        </p>
      )}

      <ul className="grid gap-4">
        {shown.map((m) => (
          <MaterialItem            goals={goals}
            goalTitle={goals.find((g) => g.id === m.goal_id)?.title}
            key={m.id}
            m={m}
            thumbUrl={m.thumb_path ? thumbs[m.thumb_path] : undefined}
            author={get(m.author_id)}
            userId={userId}
            isFamily={isFamily}
            likeCount={likeCounts[m.id] ?? 0}
            liked={myLikes.has(m.id)}
            highlight={highlight === m.id}
            onChanged={load}
          />
        ))}
      </ul>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Este material lo comparte el equipo y no sustituye la valoración de profesionales. Proyecto
        escolar: usa contenido de ejemplo.
      </div>
    </div>
  );
}