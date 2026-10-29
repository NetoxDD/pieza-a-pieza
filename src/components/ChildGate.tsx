"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Child = { id: string; name: string };
type Ctx = { child: Child; userId: string; userName: string };

const ChildCtx = createContext<Ctx | null>(null);

export function useChild() {
  const c = useContext(ChildCtx);
  if (!c) throw new Error("useChild debe usarse dentro de ChildGate");
  return c;
}

export default function ChildGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [child, setChild] = useState<Child | null>(null);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);

    const [prof, kids] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", auth.user.id).maybeSingle(),
      supabase.from("children").select("id,name").order("created_at").limit(1),
    ]);

    if (kids.error) {
      setError("No se pudo cargar tu espacio. Revisa tu conexión e intenta de nuevo.");
    } else {
      setUserName(prof.data?.full_name ?? "");
      setChild(kids.data?.[0] ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    const { data, error } = await supabase
      .from("children")
      .insert({ name: clean })
      .select("id,name")
      .single();
    setBusy(false);
    if (error) setError("No se pudo crear el espacio. Intenta de nuevo.");
    else setChild(data);
  };

  const joinChild = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.rpc("join_child", { invite_code: clean });
    if (error) {
      setBusy(false);
      setError("Código no válido o vencido. Pide uno nuevo a la familia.");
      return;
    }
    await load();
    setBusy(false);
  };

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Cargando tu espacio…
      </div>
    );

  if (!child) {
    const input =
      "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
    const tab = (active: boolean) =>
      `min-h-11 flex-1 rounded-lg text-sm font-semibold transition ${
        active
          ? "bg-[var(--sage)] text-[var(--primary)]"
          : "text-[var(--muted)] hover:bg-[var(--sage)]"
      }`;

    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-5">
        <div className="grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
          <div>
            <h1 className="text-xl font-semibold">Elige cómo empezar</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Crea el espacio de seguimiento o únete al de un niño con un código de invitación.
            </p>
          </div>

          <div className="flex gap-2" role="group" aria-label="Cómo empezar">
            <button type="button" className={tab(mode === "create")} aria-pressed={mode === "create"} onClick={() => { setMode("create"); setError(""); }}>
              Crear espacio
            </button>
            <button type="button" className={tab(mode === "join")} aria-pressed={mode === "join"} onClick={() => { setMode("join"); setError(""); }}>
              Tengo un código
            </button>
          </div>

          {mode === "create" ? (
            <form onSubmit={createChild} className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                ¿Cómo se llama el niño o la niña?
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  required
                  placeholder="Ej. Mateo"
                  className={input}
                />
              </label>
              <p className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[#74613d]">
                Proyecto escolar: usa un nombre de ejemplo o un apodo, no datos reales.
              </p>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {busy ? "Creando…" : "Crear espacio"}
              </button>
            </form>
          ) : (
            <form onSubmit={joinChild} className="grid gap-4">
              <label className="grid gap-1.5 text-xs font-semibold">
                Código de invitación
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  required
                  placeholder="Ej. 3F9A1C7B2D"
                  className={`${input} tracking-widest`}
                  autoCapitalize="characters"
                  autoComplete="off"
                />
              </label>
              <p className="text-xs text-[var(--muted)]">
                La familia lo genera en la sección Mensajes, y entrarás con el rol que ellos eligieron.
              </p>
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {busy ? "Entrando…" : "Unirme al equipo"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return <ChildCtx.Provider value={{ child, userId, userName }}>{children}</ChildCtx.Provider>;
}