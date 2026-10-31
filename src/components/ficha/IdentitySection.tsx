"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import Avatar, { PRESETS, PresetArt } from "@/components/Avatar";
import { resizeToSquare } from "@/lib/image";
import { BLOOD_TYPES, ageText, formatDate, sexLabel, type ChildProfile } from "@/lib/ficha";
import type { PublicProfile } from "@/lib/profile";

const input =
  "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

export default function IdentitySection() {
  const { child } = useChild();
  const { profile, photoUrl, editable, saveProfile } = useChildProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [birth, setBirth] = useState("");
  const [sex, setSex] = useState("");
  const [blood, setBlood] = useState("");
  const [emerg, setEmerg] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const avatarProfile: PublicProfile = {
    id: child.id,
    name: child.name,
    title: "",
    organization: "",
    bio: "",
    avatarKind: profile?.avatar_kind ?? "preset",
    avatarPreset: profile?.avatar_preset ?? "pieza",
    avatarUrl: photoUrl,
  };

  const startEdit = () => {
    setBirth(profile?.birth_date ?? "");
    setSex(profile?.sex ?? "");
    setBlood(profile?.blood_type ?? "");
    setEmerg(profile?.emergency_number ?? "");
    setMsg("");
    setEditing(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await saveProfile({
      birth_date: birth || null,
      sex: (sex || null) as ChildProfile["sex"],
      blood_type: blood || null,
      emergency_number: emerg.trim() || null,
    });
    setBusy(false);
    if (err) setMsg(err);
    else setEditing(false);
  };

  const choosePreset = async (id: string) => {
    setBusy(true);
    setMsg("");
    const old = profile?.avatar_path;
    const err = await saveProfile({ avatar_kind: "preset", avatar_preset: id, avatar_path: null });
    if (err) setMsg(err);
    else if (old) await supabase.storage.from("child-photos").remove([old]);
    setBusy(false);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMsg("Elige un archivo de imagen.");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const blob = await resizeToSquare(file, 256);
      const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
      const path = `${child.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage
        .from("child-photos")
        .upload(path, blob, { contentType: blob.type, cacheControl: "3600" });
      if (up.error) throw up.error;

      const old = profile?.avatar_path;
      const err = await saveProfile({ avatar_kind: "photo", avatar_path: path });
      if (err) {
        await supabase.storage.from("child-photos").remove([path]);
        throw new Error(err);
      }
      if (old) await supabase.storage.from("child-photos").remove([old]);
    } catch {
      setMsg("No se pudo subir la foto. Prueba con otra imagen.");
    }
    setBusy(false);
  };

  return (
    <section className="grid gap-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center gap-4">
        <Avatar profile={avatarProfile} name={child.name} size={72} />
        <div>
          <h2 className="text-lg font-semibold">{child.name}</h2>
          <p className="text-sm text-[var(--muted)]">
            {ageText(profile?.birth_date ?? null) || "Edad sin registrar"}
          </p>
        </div>
      </div>

      {editable && (
        <div className="grid gap-3 rounded-xl bg-[var(--background)] p-4">
          <p className="text-sm font-semibold">Foto o avatar</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const selected = profile?.avatar_kind !== "photo" && profile?.avatar_preset === p.id;
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
                  <PresetArt preset={p} size={40} />
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="sr-only" tabIndex={-1} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="min-h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)] disabled:opacity-60"
            >
              {profile?.avatar_kind === "photo" ? "Cambiar foto" : "Subir una foto"}
            </button>
            {profile?.avatar_kind === "photo" && (
              <button
                type="button"
                onClick={() => choosePreset(profile.avatar_preset)}
                disabled={busy}
                className="min-h-11 rounded-xl px-4 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)] disabled:opacity-60"
              >
                Quitar foto
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            Recomendamos un avatar. Si subes una foto de un menor, hazlo solo con la autorización
            de quien corresponda. Solo la ve el equipo, y se eliminan sus datos ocultos (como la
            ubicación).
          </p>
        </div>
      )}

      {!editing ? (
        <>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Fecha de nacimiento</dt>
              <dd>{formatDate(profile?.birth_date ?? null) || "Sin registrar"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Sexo</dt>
              <dd>{profile?.sex ? sexLabel[profile.sex] : "Sin registrar"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Grupo sanguíneo</dt>
              <dd>{profile?.blood_type ?? "Sin registrar"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">Número de emergencias local</dt>
              <dd>{profile?.emergency_number ?? "Sin registrar"}</dd>
            </div>
          </dl>
          {editable && (
            <div>
              <button
                type="button"
                onClick={startEdit}
                className="min-h-11 rounded-xl border border-[var(--border)] px-5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
              >
                Editar datos
              </button>
            </div>
          )}
        </>
      ) : (
        <form onSubmit={save} className="grid gap-4">
          <label className="grid gap-1.5 text-xs font-semibold">
            Fecha de nacimiento
            <input
              type="date"
              value={birth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setBirth(e.target.value)}
              className={input}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Sexo
            <select value={sex} onChange={(e) => setSex(e.target.value)} className={input}>
              <option value="">Sin indicar</option>
              {Object.entries(sexLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Grupo sanguíneo
            <select value={blood} onChange={(e) => setBlood(e.target.value)} className={input}>
              <option value="">Sin indicar</option>
              {BLOOD_TYPES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold">
            Número de emergencias local
            <input
              value={emerg}
              onChange={(e) => setEmerg(e.target.value)}
              maxLength={20}
              inputMode="tel"
              placeholder="El que se marca en tu país"
              className={input}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
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

      {msg && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {msg}
        </p>
      )}
    </section>
  );
}