"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { SOON_DAYS, expiryLabel, expiryOf } from "@/lib/documents";
import { DOSE_COLS, MED_COLS, computeSlots, fmtQty, lowStock, type Dose, type Med } from "@/lib/meds";
import { isoWeekday, localDate } from "@/lib/routines";

export type TodayAlert = {
  id: string;
  label: string;
  href: string;
  tone: "normal" | "atencion";
};

type Ctx = {
  loaded: boolean;
  hasMeds: boolean;
  hasRoutines: boolean;
  nextDose: { med: string; time: string } | null;
  lateDoses: number;
  pendingSteps: number;
  alerts: TodayAlert[];
  attention: boolean;
};

const EMPTY: Ctx = {
  loaded: false,
  hasMeds: false,
  hasRoutines: false,
  nextDose: null,
  lateDoses: 0,
  pendingSteps: 0,
  alerts: [],
  attention: false,
};

const TodayCtx = createContext<Ctx>(EMPTY);
export const useToday = () => useContext(TodayCtx);

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function TodayProvider({ children }: { children: React.ReactNode }) {
  const { child } = useChild();
  const { access } = useChildProfile();
  const [data, setData] = useState<Ctx>(EMPTY);

  const load = useCallback(async () => {
    const now = new Date();
    const day = localDate(now);
    const wd = isoWeekday(now);
    const alerts: TodayAlert[] = [];

    // ---------- Medicinas (solo si tu rol puede verlas) ----------
    let meds: Med[] = [];
    let doses: Dose[] = [];
    if (access.medications) {
      const m = await supabase.from("child_medications").select(MED_COLS).eq("child_id", child.id).eq("active", true);
      if (!m.error) meds = m.data as Med[];
      if (meds.length > 0) {
        const since = new Date(Date.now() - 2 * 86400000).toISOString();
        const d = await supabase
          .from("med_doses")
          .select(DOSE_COLS)
          .eq("child_id", child.id)
          .gte("recorded_at", since);
        if (!d.error) doses = d.data as Dose[];
      }
    }
    const slots = computeSlots(meds, doses, now).filter((s) => !s.resolved);
    const lateDoses = slots.filter((s) => s.late).length;
    const upcoming = slots.filter((s) => !s.late && !s.yesterday).sort((a, b) => a.due.getTime() - b.due.getTime())[0];
    const nextDose = upcoming ? { med: upcoming.med.name, time: upcoming.time } : null;

    // ---------- Rutinas de hoy ----------
    let pendingSteps = 0;
    let hasRoutines = false;
    const r = await supabase.from("routines").select("id,days").eq("child_id", child.id).eq("active", true);
    if (!r.error) {
      const todays = (r.data as { id: string; days: number[] }[]).filter((x) => x.days.includes(wd));
      hasRoutines = todays.length > 0;
      if (hasRoutines) {
        const ids = todays.map((x) => x.id);
        const [o, s] = await Promise.all([
          supabase.from("routine_overrides").select("routine_id").eq("day", day).in("routine_id", ids),
          supabase.from("routine_steps").select("id,routine_id").in("routine_id", ids),
        ]);
        const skipped = new Set((o.data ?? []).map((x) => x.routine_id as string));
        const steps = ((s.data ?? []) as { id: string; routine_id: string }[]).filter((x) => !skipped.has(x.routine_id));
        if (steps.length > 0) {
          const dn = await supabase
            .from("routine_step_done")
            .select("step_id")
            .eq("day", day)
            .in("step_id", steps.map((x) => x.id));
          const done = new Set((dn.data ?? []).map((x) => x.step_id as string));
          pendingSteps = steps.filter((x) => !done.has(x.id)).length;
        }
      }
    }

    // ---------- Receta e inventario ----------
    if (access.medications && meds.length > 0) {
      const [rx, st] = await Promise.all([
        supabase.rpc("my_med_rx", { cid: child.id }),
        supabase.rpc("my_stock", { cid: child.id }),
      ]);
      if (!rx.error) {
        (rx.data as { medication_id: string; valid_until: string }[]).forEach((x) => {
          const med = meds.find((m) => m.id === x.medication_id);
          const e = expiryOf(x.valid_until);
          if (med && (e.state === "soon" || e.state === "expired")) {
            alerts.push({
              id: `rx-${med.id}`,
              label: `Receta de ${med.name}: ${expiryLabel(e)}`,
              href: "/registro/medicinas",
              tone: e.state === "expired" ? "atencion" : "normal",
            });
          }
        });
      }
      if (!st.error) {
        (st.data as { medication_id: string; on_hand: number | string }[]).forEach((x) => {
          const med = meds.find((m) => m.id === x.medication_id);
          if (!med) return;
          const onHand = Number(x.on_hand);
          if (onHand < 0) {
            alerts.push({
              id: `stk-${med.id}`,
              label: `Inventario de ${med.name} por revisar (marca ${fmtQty(onHand)})`,
              href: "/registro/medicinas",
              tone: "atencion",
            });
            return;
          }
          const s = lowStock(med, onHand, now);
          if (s.low && s.days !== null) {
            const n = Math.round(s.days);
            alerts.push({
              id: `stk-${med.id}`,
              label: `De ${med.name} quedan unos ${n} ${n === 1 ? "día" : "días"}. Conviene resurtir`,
              href: "/registro/medicinas",
              tone: n <= 2 ? "atencion" : "normal",
            });
          }
        });
      }
    }

    // ---------- Documentos por vencer (sin repetir las recetas ya vinculadas) ----------
    const limit = new Date();
    limit.setDate(limit.getDate() + SOON_DAYS);
    const dc = await supabase
      .from("documents")
      .select("id,title,valid_until")
      .eq("child_id", child.id)
      .not("valid_until", "is", null)
      .lte("valid_until", isoDate(limit))
      .order("valid_until")
      .limit(6);
    if (!dc.error) {
      const linked = new Set(meds.map((m) => m.document_id).filter((x): x is string => !!x));
      (dc.data as { id: string; title: string; valid_until: string }[])
        .filter((x) => !linked.has(x.id))
        .forEach((x) => {
          const e = expiryOf(x.valid_until);
          alerts.push({
            id: `doc-${x.id}`,
            label: `${x.title}: ${expiryLabel(e)}`,
            href: "/documentos/#vencen",
            tone: e.state === "expired" ? "atencion" : "normal",
          });
        });
    }

    alerts.sort((a, b) => Number(b.tone === "atencion") - Number(a.tone === "atencion"));

    setData({
      loaded: true,
      hasMeds: meds.length > 0,
      hasRoutines,
      nextDose,
      lateDoses,
      pendingSteps,
      alerts,
      attention: lateDoses > 0,
    });
  }, [child.id, access.medications]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase.channel(`today:${child.id}`);
    ["med_doses", "routine_step_done", "med_stock_ledger"].forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => load());
    });
    channel.subscribe();
    const timer = setInterval(load, 60000);
    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [child.id, load]);

  return <TodayCtx.Provider value={data}>{children}</TodayCtx.Provider>;
}