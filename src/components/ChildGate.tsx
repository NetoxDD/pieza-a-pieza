"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Child = { id: string; name: string };
type Kid = Child & { role: string };

type Ctx = {
  child: Child;
  kids: Kid[];
  role: string;
  userId: string;
  userName: string;
  switchChild: (id: string) => void;
  startAdding: () => void;
};

const ChildCtx = createContext<Ctx | null>(null);

export function useChild() {
  const c = useContext(ChildCtx);
  if (!c) throw new Error("useChild debe usarse dentro de ChildGate");
  return c;
}

const storageKey = (uid: string) => `pap:activeChild:${uid}`;
const readActive = (uid: string) => {
  try {
    return localStorage.getItem(storageKey(uid));
  } catch {
    return null;
  }
};
const saveActive = (uid: string, id: string) => {
  try {
    localStorage.setItem(storageKey(uid), id);
  } catch {
    /* sin almacenamiento disponible: no pasa nada */
  }
};

function Onboarding({
  canCancel,
  onCancel,
  onCreate,
  onJoin,
}: {
  canCancel: boolean;
  onCancel: () => void;
  onCreate: (name: string) => Promise<string | null>;
  onJoin: (code: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const input =
    "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";
  const tab = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg text-sm font-semibold transition ${
      active ? "bg-[var(--sage)] text-[var(--primary)]" : "text-[var(--muted)] hover:bg-[var(--sage)]"
    }`;

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError("");
    const err = await fn();
    if (err) {
      setError(err);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-5">
      <div className="grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7">
        <div>
          <h1 className="text-xl font-semibold">
            {canCancel ? "Añadir otro niño" : "Elige cómo empezar"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Crea un espacio de seguimiento o únete al de un niño con un código de invitación.
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => onCreate(name.trim()));
            }}
            className="grid gap-4"
          >
            <label className="grid gap-1.5 text-xs font-semibold">
              ¿Cómo se llama el niño o la niña?
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Ej. Mateo" className={input} />
            </label>
            <p className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[#74613d]">
              Proyecto escolar: usa un nombre de ejemplo o un apodo, no datos reales.
            </p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy || !name.trim()} className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {busy ? "Creando…" : "Crear espacio"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => onJoin(code.trim()));
            }}
            className="grid gap-4"
          >
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
              La familia lo genera en la sección Equipo, y entrarás con el rol que ellos elijan.
            </p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy || !code.trim()} className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {busy ? "Entrando…" : "Unirme al equipo"}
            </button>
          </form>
        )}

        {canCancel && (
          <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--muted)] hover:bg-[var(--sage)]">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export default function ChildGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [kids, setKids] = useState<Kid[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");

  const load = useCallback(async (prefer?: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const uid = auth.user.id;
    setUserId(uid);

    const [prof, list, mem] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
      supabase.from("children").select("id,name").order("created_at"),
      supabase.from("child_members").select("child_id,role").eq("user_id", uid),
    ]);

    if (list.error || mem.error) {
      setFailed(true);
      setLoading(false);
      return;
    }

    const roles: Record<string, string> = Object.fromEntries(
      mem.data.map((m) => [m.child_id, m.role])
    );
    const mine: Kid[] = list.data
      .filter((k) => roles[k.id])
      .map((k) => ({ id: k.id, name: k.name, role: roles[k.id] }));

    const stored = readActive(uid);
    const pick =
      mine.find((k) => k.id === prefer) ?? mine.find((k) => k.id === stored) ?? mine[0] ?? null;

    setKids(mine);
    setActiveId(pick?.id ?? null);
    if (pick) saveActive(uid, pick.id);
    setUserName(prof.data?.full_name ?? "");
    setFailed(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createChild = async (name: string) => {
    const { data, error } = await supabase
      .from("children")
      .insert({ name })
      .select("id")
      .single();
    if (error) return "No se pudo crear el espacio. Intenta de nuevo.";
    await load(data.id);
    setAdding(false);
    return null;
  };

  const joinChild = async (code: string) => {
    const { data, error } = await supabase.rpc("join_child", { invite_code: code });
    if (error) return "Código no válido o vencido. Pide uno nuevo a la familia.";
    await load(data as string);
    setAdding(false);
    return null;
  };

  const switchChild = (id: string) => {
    setActiveId(id);
    saveActive(userId, id);
  };

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Cargando tu espacio…
      </div>
    );

  if (failed)
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] p-5">
        <div className="grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 text-center">
          <h1 className="text-xl font-semibold">No pudimos cargar tu espacio</h1>
          <p className="text-sm text-[var(--muted)]">Revisa tu conexión a internet e intenta de nuevo.</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setFailed(false);
              load();
            }}
            className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          >
            Reintentar
          </button>
        </div>
      </div>
    );

  if (kids.length === 0 || adding)
    return (
      <Onboarding
        canCancel={kids.length > 0}
        onCancel={() => setAdding(false)}
        onCreate={createChild}
        onJoin={joinChild}
      />
    );

  const active = kids.find((k) => k.id === activeId) ?? kids[0];

  return (
    <ChildCtx.Provider
      value={{
        child: { id: active.id, name: active.name },
        kids,
        role: active.role,
        userId,
        userName,
        switchChild,
        startAdding: () => setAdding(true),
      }}
    >
      {/* La llave obliga a reconstruir toda la pantalla al cambiar de niño */}
      <Fragment key={active.id}>{children}</Fragment>
    </ChildCtx.Provider>
  );
}