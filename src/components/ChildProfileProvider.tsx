"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import type { Allergy, ChildProfile, Contact } from "@/lib/ficha";

type Patch = Partial<Omit<ChildProfile, "health_consent_at">>;

type Ctx = {
  loading: boolean;
  error: string;
  profile: ChildProfile | null;
  allergies: Allergy[];
  contacts: Contact[];
  photoUrl?: string;
  canEdit: boolean; // es de la familia
  consented: boolean; // ya hay consentimiento
  editable: boolean; // puede editar de verdad
  reload: () => Promise<void>;
  saveProfile: (patch: Patch) => Promise<string | null>;
};

const ProfileCtx = createContext<Ctx | null>(null);

export function useChildProfile() {
  const c = useContext(ProfileCtx);
  if (!c) throw new Error("useChildProfile debe usarse dentro de ChildProfileProvider");
  return c;
}

export default function ChildProfileProvider({ children }: { children: React.ReactNode }) {
  const { child, role } = useChild();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();

  const load = useCallback(async () => {
    const [prof, al, co] = await Promise.all([
      supabase
        .from("child_profile")
        .select(
          "birth_date,sex,avatar_kind,avatar_preset,avatar_path,blood_type,emergency_number,helps_text,health_consent_at"
        )
        .eq("child_id", child.id)
        .maybeSingle(),
      supabase
        .from("child_allergies")
        .select("id,substance,kind,reaction,severity")
        .eq("child_id", child.id)
        .order("created_at"),
      supabase
        .from("child_contacts")
        .select("id,kind,name,relation,phone,address,notes,is_emergency")
        .eq("child_id", child.id)
        .order("created_at"),
    ]);

    if (prof.error || al.error || co.error) {
      setError("No se pudo cargar la ficha. Revisa tu conexión e intenta de nuevo.");
      setLoading(false);
      return;
    }

    const p = prof.data as ChildProfile | null;
    setProfile(p);
    setAllergies(al.data as Allergy[]);
    setContacts(co.data as Contact[]);

    if (p?.avatar_kind === "photo" && p.avatar_path) {
      const { data } = await supabase.storage
        .from("child-photos")
        .createSignedUrl(p.avatar_path, 3600);
      setPhotoUrl(data?.signedUrl);
    } else {
      setPhotoUrl(undefined);
    }
    setError("");
    setLoading(false);
  }, [child.id]);

  useEffect(() => {
    load();
    // El enlace de la foto dura 1 hora: se renueva antes de que venza
    const timer = setInterval(load, 50 * 60 * 1000);
    return () => clearInterval(timer);
  }, [load]);

  const saveProfile = async (patch: Patch) => {
    const { data, error } = await supabase
      .from("child_profile")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("child_id", child.id)
      .select("child_id");
    // Si la base de datos rechaza el cambio por permisos, no devuelve error: devuelve 0 filas
    if (error || !data?.length) return "No se pudo guardar. Revisa tus permisos e intenta de nuevo.";
    await load();
    return null;
  };

  const canEdit = role === "familia";
  const consented = !!profile?.health_consent_at;

  return (
    <ProfileCtx.Provider
      value={{
        loading,
        error,
        profile,
        allergies,
        contacts,
        photoUrl,
        canEdit,
        consented,
        editable: canEdit && consented,
        reload: load,
        saveProfile,
      }}
    >
      {children}
    </ProfileCtx.Provider>
  );
}