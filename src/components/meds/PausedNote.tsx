"use client";

import { useCallback, useEffect, useState } from "react";
import { useChild } from "@/components/ChildGate";
import { useChildProfile } from "@/components/ChildProfileProvider";
import { localDate } from "@/lib/routines";
import { formatDate } from "@/lib/ficha";
import { fetchPauses, pauseActive, type Pause } from "@/lib/meds";

export default function PausedNote() {
  const { child } = useChild();
  const { access } = useChildProfile();
  const [rows, setRows] = useState<Pause[]>([]);

  const load = useCallback(async () => {
    if (!access.medications) return;
    const p = await fetchPauses(child.id);
    if (p) setRows(p);
  }, [child.id, access.medications]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const today = localDate();
  const now = rows.filter((p) => p.source === "manual" && pauseActive(p, today));
  if (now.length === 0) return null;

  return (
    <p role="status" className="rounded-xl bg-[var(--sand)] p-3 text-sm text-[var(--sand-text)]">
      <strong>En pausa hoy:</strong>{" "}
      {now.map((p) => `${p.med_name}${p.to_date ? ` (hasta el ${formatDate(p.to_date)})` : ""}`).join(", ")}
    </p>
  );
}