"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import type { PublicProfile } from "@/lib/profile";

type Ctx = {
  get: (id: string) => PublicProfile | undefined;
  reload: () => void;
};

const ProfilesCtx = createContext<Ctx | null>(null);

export function useProfiles() {
  const c = useContext(ProfilesCtx);
  if (!c) throw new Error("useProfiles debe usarse dentro de ProfilesProvider");
  return c;
}

export default function ProfilesProvider({ children }: { children: React.ReactNode }) {
  const { child } = useChild();
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});

  const load = useCallback(async () => {
    const [mem, prof, con] = await Promise.all([
      supabase.from("child_members").select("user_id,role").eq("child_id", child.id),
      supabase
        .from("profiles")
        .select("id,full_name,title,organization,bio,avatar_kind,avatar_preset,avatar_path"),
      supabase.from("profile_contacts").select("user_id,phone"),
    ]);
    if (mem.error || prof.error) return;

    const roles: Record<string, string> = Object.fromEntries(
      mem.data.map((m) => [m.user_id, m.role])
    );
    const phones: Record<string, string> = con.error
      ? {}
      : Object.fromEntries(con.data.filter((c) => c.phone).map((c) => [c.user_id, c.phone as string]));

    // Enlaces temporales para las fotos (la base de datos solo los entrega a quien corresponde)
    const paths = prof.data
      .filter((p) => p.avatar_kind === "photo" && p.avatar_path)
      .map((p) => p.avatar_path as string);
    const urls: Record<string, string> = {};
    if (paths.length > 0) {
      const { data } = await supabase.storage.from("avatars").createSignedUrls(paths, 3600);
      data?.forEach((d) => {
        if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
      });
    }

    const map: Record<string, PublicProfile> = {};
    prof.data.forEach((p) => {
      map[p.id] = {
        id: p.id,
        name: p.full_name || "Sin nombre",
        title: p.title ?? "",
        organization: p.organization ?? "",
        bio: p.bio ?? "",
        avatarKind: p.avatar_kind,
        avatarPreset: p.avatar_preset,
        avatarUrl: p.avatar_path ? urls[p.avatar_path] : undefined,
        phone: phones[p.id],
        role: roles[p.id],
      };
    });
    setProfiles(map);
  }, [child.id]);

  useEffect(() => {
    load();
    // Los enlaces de las fotos duran 1 hora: se renuevan antes de que venzan
    const timer = setInterval(load, 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <ProfilesCtx.Provider value={{ get: (id) => profiles[id], reload: load }}>
      {children}
    </ProfilesCtx.Provider>
  );
}