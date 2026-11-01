"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import EmergencyView from "@/components/EmergencyView";
import { buildSnapshot, copyEnabled, readCopy, saveCopy } from "@/lib/emergency";

export default function EmergencyButton() {
  const { child, role, userId } = useChild();
  const p = useChildProfile();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const live = !p.loading && !p.error;

  const snap = useMemo(
    () =>
      buildSnapshot({
        childId: child.id,
        childName: child.name,
        role,
        profile: p.profile,
        allergies: p.allergies,
        contacts: p.contacts,
        meds: p.meds,
        conditions: p.conditions,
        access: p.access,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [child.id, child.name, role, p.profile, p.allergies, p.contacts, p.meds, p.conditions, p.access]
  );

  // Cada vez que los datos cargan bien, se actualiza la copia (si está activada)
  useEffect(() => {
    if (!live) return;
    if (copyEnabled(userId, role)) saveCopy(userId, snap);
  }, [live, snap, userId, role, tick]);

  // Ajustes avisa cuando se activa la copia, para guardarla en ese momento
  useEffect(() => {
    const h = () => setTick((t) => t + 1);
    window.addEventListener("pap:emergency-sync", h);
    return () => window.removeEventListener("pap:emergency-sync", h);
  }, []);

  const logEvent = (act: "vista" | "impresa") => {
    if (!live) return; // sin conexión no se puede registrar
    supabase.rpc("log_emergency", { cid: child.id, act }).then(
      () => {},
      () => {}
    );
  };

  const openView = () => {
    logEvent("vista");
    setOpen(true);
  };

  const shown = live ? snap : readCopy(userId, child.id);

  return (
    <>
      <button
        type="button"
        onClick={openView}
        aria-label="Abrir la ficha de emergencia"
        className="flex min-h-11 items-center gap-2 rounded-full bg-[#b00020] px-3 text-xs font-bold text-[#ffffff] hover:bg-[#8e001a]"
      >
        <AlertTriangle size={16} aria-hidden />
        <span className="hidden min-[420px]:inline">Emergencia</span>
      </button>

      {open && (
        <EmergencyView
          snap={shown}
          source={live ? "live" : "cache"}
          onClose={() => setOpen(false)}
          onPrint={() => logEvent("impresa")}
        />
      )}
    </>
  );
}