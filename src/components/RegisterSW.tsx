"use client";

import { useEffect } from "react";
import { BASE } from "@/lib/base";

export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return; // en local no, para evitar cachés confusas
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(`${BASE}/sw.js`, { scope: `${BASE}/` })
      .catch(() => {});
  }, []);

  return null;
}