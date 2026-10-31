"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";

import { roleLabel, roleKeys } from "@/lib/roles";

type Member = { user_id: string; role: string; name: string };
type Invite = { code: string; role: string; expires_at: string };

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

export default function TeamPanel() {
  const { child, userId } = useChild();
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [role, setRole] = useState("tutor");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [mem, prof, kid, inv] = await Promise.all([
      supabase.from("child_members").select("user_id,role").eq("child_id", child.id),
      supabase.from("profiles").select("id,full_name"),
      supabase.from("children").select("created_by").eq("id", child.id).single(),
      supabase
        .from("child_invites")
        .select("code,role,expires_at")
        .eq("child_id", child.id)
        .order("created_at", { ascending: false }),
    ]);

    if (mem.error || prof.error || kid.error || inv.error) {
      setError("No se pudo cargar el equipo.");
      return;
    }

    const names = Object.fromEntries(prof.data.map((p) => [p.id, p.full_name]));
    const owner = kid.data.created_by as string;
    const list: Member[] = mem.data
      .map((m) => ({ ...m, name: names[m.user_id] || "Sin nombre" }))
      .sort((a, b) => Number(b.user_id === owner) - Number(a.user_id === owner));

    setOwnerId(owner);
    setMembers(list);
    setInvites(inv.data as Invite[]);
  }, [child.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwner = ownerId === userId;
  const isFamily = members.some((m) => m.user_id === userId && m.role === "familia");
  const inviteRoles = roleKeys.filter((k) => isOwner || k !== "familia");

  const generate = async () => {
    setBusy(true);
    setError("");
    setCode("");
    const { data, error } = await supabase.rpc("create_invite", { cid: child.id, r: role });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setCode(data as string);
      load();
    }
  };

  const copy = async (c: string) => {
    try {
      await navigator.clipboard.writeText(c);
      setCopied(c);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("No se pudo copiar. Selecciona el código y cópialo a mano.");
    }
  };

  const revoke = async (c: string) => {
    const { error } = await supabase.from("child_invites").delete().eq("code", c);
    if (error) setError("No se pudo revocar la invitación.");
    else {
      if (code === c) setCode("");
      load();
    }
  };

  const changeRole = async (uid: string, newRole: string) => {
    setError("");
    const { error } = await supabase.rpc("change_member_role", {
      cid: child.id,
      uid,
      new_role: newRole,
    });
    if (error) setError(error.message);
    load();
  };

  const removeMember = async (m: Member) => {
    const self = m.user_id === userId;
    const ok = window.confirm(
      self
        ? "¿Salir de este equipo? Dejarás de ver el espacio."
        : `¿Quitar a ${m.name} del equipo?`
    );
    if (!ok) return;
    setError("");
    const { error } = await supabase.rpc("remove_member", { cid: child.id, uid: m.user_id });
    if (error) {
      setError(error.message);
      return;
    }
    if (self) window.location.reload();
    else load();
  };

  return (
    <section id="equipo" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="text-lg font-semibold">Aquí estamos</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">Personas que acompañan el seguimiento.</p>

      <ul className="mt-5 grid gap-4">
        {members.map((m) => {
          const self = m.user_id === userId;
          const owner = m.user_id === ownerId;
          return (
            <li key={m.user_id} className="grid gap-2">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    m.role === "familia"
                      ? "bg-[var(--sage)] text-[var(--primary)]"
                      : "bg-[var(--blue)] text-[var(--blue-text)]"
                  }`}
                >
                  {initials(m.name)}
                </span>
                <div className="min-w-0">
                  <strong className="block text-sm leading-tight [overflow-wrap:anywhere]">
                    {m.name}
                    {self && " (tú)"}
                  </strong>
                  <small className="text-xs text-[var(--muted)]">
                    {owner ? "Familiar principal" : roleLabel[m.role] ?? m.role}
                  </small>
                </div>
              </div>

              {!owner && (isOwner || self) && (
                <div className="flex flex-wrap items-center gap-2 pl-[3.25rem]">
                  {isOwner && (
                    <label className="text-xs">
                      <span className="sr-only">Rol de {m.name}</span>
                      <select
                        value={m.role}
                        onChange={(e) => changeRole(m.user_id, e.target.value)}
                        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs"
                      >
                        {roleKeys.map((k) => (
                          <option key={k} value={k}>
                            {roleLabel[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMember(m)}
                    className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)] hover:text-[var(--primary)]"
                  >
                    {self ? "Salir del equipo" : "Quitar"}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {isFamily && (
        <div className="mt-6 grid gap-3 border-t border-[var(--border)] pt-5">
          <h3 className="text-sm font-semibold">Invitar a alguien del equipo</h3>
          <label className="grid gap-1.5 text-xs font-semibold">
            Rol que tendrá
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-normal"
            >
              {inviteRoles.map((k) => (
                <option key={k} value={k}>
                  {roleLabel[k]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="min-h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-[var(--on-primary)] transition hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? "Generando…" : "Generar código"}
          </button>

          {code && (
            <div className="rounded-xl bg-[var(--blue)] p-4" role="status">
              <p className="text-xs text-[var(--blue-text)]">
                Comparte este código. Sirve una sola vez y vence en 7 días.
              </p>
              <p className="mt-2 select-all text-xl font-bold tracking-widest">{code}</p>
            </div>
          )}

          {invites.length > 0 && (
            <div className="mt-2">
              <h3 className="text-sm font-semibold">Invitaciones pendientes</h3>
              <ul className="mt-2 divide-y divide-[var(--border)]">
                {invites.map((i) => (
                  <li key={i.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div>
                      <span className="text-sm font-semibold tracking-widest">{i.code}</span>
                      <small className="block text-xs text-[var(--muted)]">
                        {roleLabel[i.role] ?? i.role} · vence el{" "}
                        {new Date(i.expires_at).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                        })}
                      </small>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => copy(i.code)}
                        className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--sage)]"
                      >
                        {copied === i.code ? "✓ Copiado" : "Copiar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(i.code)}
                        className="min-h-11 rounded-lg px-3 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--sage)]"
                      >
                        Revocar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
    </section>
  );
}