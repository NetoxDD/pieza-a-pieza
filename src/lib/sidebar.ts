"use client";

import { useEffect, useState } from "react";

const KEY = "pap:sidebar";

// Estado del menú lateral: "full" (con texto) o "min" (solo iconos).
// Vive en <html data-sidebar> para que el diseño no parpadee al cargar.
export function toggleSidebar() {
  const d = document.documentElement;
  const next = d.dataset.sidebar === "min" ? "full" : "min";
  d.dataset.sidebar = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  window.dispatchEvent(new Event("pap:sidebar"));
}

export function useSidebarMin() {
  const [min, setMin] = useState(false);
  useEffect(() => {
    const read = () => setMin(document.documentElement.dataset.sidebar === "min");
    read();
    window.addEventListener("pap:sidebar", read);
    return () => window.removeEventListener("pap:sidebar", read);
  }, []);
  return min;
}
