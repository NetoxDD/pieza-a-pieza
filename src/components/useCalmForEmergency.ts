"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CalmForCard = { kind: string; body: string }[] | null;

// Trae el plan solo si la familia lo activó para la ficha de emergencia.
// Sin conexión se conserva lo último que se cargó (y la copia local lo guarda).
export function useCalmForEmergency(childId: string): CalmForCard {
  const [calm, setCalm] = useState<CalmForCard>(null);

  const load = useCallback(async () => {
    const s = await supabase.from("calm_plan_settings").select("in_emergency").eq("child_id", childId).maybeSingle();
    if (s.error) return;
    if (!s.data?.in_emergency) {
      setCalm(null);
      return;
    }
    const it = await supabase
      .from("calm_plan_items")
      .select("kind,body,position")
      .eq("child_id", childId)
      .order("position");
    if (!it.error) setCalm((it.data ?? []).map((x) => ({ kind: x.kind as string, body: x.body as string })));
  }, [childId]);

  useEffect(() => {
    load();
    window.addEventListener("pap:calm-sync", load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("pap:calm-sync", load);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  return calm;
}