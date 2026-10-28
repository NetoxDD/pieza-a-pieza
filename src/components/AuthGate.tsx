"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { BASE } from "@/lib/base";

function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) setError(error.message);
      else if (!data.session)
        setInfo("Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Correo o contraseña incorrectos.");
    }
    setBusy(false);
  };

  const input =
    "min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal";

  return (
    <div className="grid min-h-screen place-items-center bg-[var(--background)] p-5">
      <form
        onSubmit={submit}
        className="grid w-full max-w-sm gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7"
      >
        <div className="flex items-center gap-3">
          <Image src={`${BASE}/logo.png`} alt="" width={44} height={44} />
          <span className="text-2xl font-bold leading-none tracking-tight">
            Pieza <span className="text-[var(--primary)]">a pieza</span>
          </span>
        </div>

        <div>
          <h1 className="text-xl font-semibold">
            {mode === "login" ? "Bienvenida/o de nuevo" : "Crea tu cuenta"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Un espacio compartido para acompañar a los niños, en equipo.
          </p>
        </div>

        {mode === "signup" && (
          <label className="grid gap-1.5 text-xs font-semibold">
            Tu nombre
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </label>
        )}

        <label className="grid gap-1.5 text-xs font-semibold">
          Correo
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>

        <label className="grid gap-1.5 text-xs font-semibold">
          Contraseña
          <input
            className={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {info && <p role="status" className="text-sm text-[var(--primary)]">{info}</p>}

        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
            setInfo("");
          }}
          className="text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          {mode === "login" ? "¿Primera vez? Crear cuenta" : "Ya tengo cuenta"}
        </button>

        <p className="rounded-lg bg-[var(--sand)] p-3 text-xs text-[#74613d]">
          Proyecto escolar. Usa solo datos de ejemplo, no información real de menores.
        </p>
      </form>
    </div>
  );
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">
        Cargando…
      </div>
    );

  return session ? <>{children}</> : <AuthForm />;
}