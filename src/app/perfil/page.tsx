"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useProfiles } from "@/components/ProfilesProvider";
import Avatar, { PRESETS, PresetArt } from "@/components/Avatar";
import { resizeToSquare } from "@/lib/image";
import { roleLabel } from "@/lib/roles";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function Perfil() {
  const { userId, role, child } = useChild();
  const { get, reload } = useProfiles();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [kind, setKind] = useState<"preset" | "photo">("preset");
  const [preset, setPreset] = useState("pieza");
  const [avatarPath, setAvatarPath] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, c] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name,title,organization,bio,avatar_kind,avatar_preset,avatar_path")
          .eq("id", userId)
          .single(),
        supabase.from("profile_contacts").select("phone,visible").eq("user_id", userId).maybeSingle(),
      ]);
      if (p.data) {
        setName(p.data.full_name ?? "");
        setTitle(p.data.title ?? "");
        setOrganization(p.data.organization ?? "");
        setBio(p.data.bio ?? "");
        setKind(p.data.avatar_kind);
        setPreset(p.data.avatar_preset);
        setAvatarPath(p.data.avatar_path);
      }
      if (c.data) {
        setPhone(c.data.phone ?? "");
        setPhoneVisible(c.data.visible);
      }
      setLoaded(true);
    })();
  }, [userId]);

  const say = (text: string, good = false) => {
    setMsg(text);
    setOk(good);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setMsg("");
    const [a, b] = await Promise.all([
      supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          title: title.trim() || null,
          organization: organization.trim() || null,
          bio: bio.trim() || null,
        })
        .eq("id", userId),
      supabase.from("profile_contacts").upsert({
        user_id: userId,
        phone: phone.trim() || null,
        visible: phoneVisible,
        updated_at: new Date().toISOString(),
      }),
    ]);
    setBusy(false);
    if (a.error || b.error) say("No se pudieron guardar los cambios. Intenta de nuevo.");
    else {
      say("✓ Perfil guardado", true);
      reload();
    }
  };

  const choosePreset = async (id: string) => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_kind: "preset", avatar_preset: id, avatar_path: null })
      .eq("id", userId);
    if (error) {
      say("No se pudo cambiar el avatar.");
    } else {
      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
      setKind("preset");
      setPreset(id);
      setAvatarPath(null);
      reload();
    }
    setBusy(false);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      say("Elige un archivo de imagen.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const blob = await resizeToSquare(file, 256);
      const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const up = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type, cacheControl: "3600" });
      if (up.error) throw up.error;

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_kind: "photo", avatar_path: path })
        .eq("id", userId);
      if (error) throw error;

      if (avatarPath) await supabase.storage.from("avatars").remove([avatarPath]);
      setKind("photo");
      setAvatarPath(path);
      reload();
      say("✓ Foto actualizada", true);
    } catch {
      say("No se pudo subir la foto. Prueba con otra imagen.");
    }
    setBusy(false);
  };

  return (
    <div className="grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi perfil</h1>
        <p className="mt-1 text-[var(--muted)]">
          Así te ve el equipo de {child.name}. Tu rol aquí: {roleLabel[role] ?? role}.
        </p>
      </div>

      <section className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex items-center gap-4">
          <Avatar profile={get(userId)} name={name || "?"} size={72} />
          <div>
            <h2 className="text-lg font-semibold">Tu foto o avatar</h2>
            <p className="text-sm text-[var(--muted)]">
              Solo la ven las personas que comparten algún niño contigo.
            </p>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Elige un avatar</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const selected = kind === "preset" && preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p.id)}
                  disabled={busy}
                  aria-pressed={selected}
                  aria-label={p.label}
                  className={`rounded-full p-1 transition disabled:opacity-60 ${
                    selected ? "ring-4 ring-[var(--primary)]" : "ring-1 ring-[var(--border)] hover:ring-2"
                  }`}
                >
                  <PresetArt preset={p} size={48} />
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPick}
            className="sr-only"
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60"
          >
            {kind === "photo" ? "Cambiar foto" : "Subir una foto"}
          </button>
          {kind === "photo" && (
            <button
              type="button"
              onClick={() => choosePreset(preset)}
              disabled={busy}
              className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
            >
              Quitar foto
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--muted)]">
          La foto se recorta en cuadrado y se reduce antes de subirse, y se eliminan sus datos
          ocultos (como la ubicación).
        </p>
      </section>

      <form
        onSubmit={save}
        className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <h2 className="text-lg font-semibold">Tus datos</h2>

        {!loaded && <p className="text-sm text-[var(--muted)]">Cargando…</p>}

        <label className="grid gap-1.5 text-xs font-semibold">
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required className={input} />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold">
          Profesión o título (opcional)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="Ej. Pediatra, Maestra de 3.º"
            className={input}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold">
          Institución (opcional)
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            maxLength={80}
            placeholder="Ej. Escuela primaria, Clínica"
            className={input}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold">
          Unas palabras sobre ti (opcional)
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm font-normal"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold">
          Teléfono (opcional)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            autoComplete="tel"
            className={input}
          />
        </label>

        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={phoneVisible}
            onChange={(e) => setPhoneVisible(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"
          />
          <span>
            Mostrar mi teléfono al equipo
            <small className="block text-xs text-[var(--muted)]">
              Si lo dejas apagado, nadie más puede verlo, aunque lo hayas escrito.
            </small>
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="min-h-11 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          {msg && (
            <p
              role={ok ? "status" : "alert"}
              className={`text-sm ${ok ? "font-medium text-[var(--primary)]" : "text-[var(--danger)]"}`}
            >
              {msg}
            </p>
          )}
        </div>
      </form>

      <div className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
        Proyecto escolar: usa datos de ejemplo, no tu teléfono ni una foto reales si no quieres.
      </div>
    </div>
  );
}