"use client";

import { useEffect } from "react";
import { CODE_RE, savePending } from "@/lib/invites";

// Va FUERA del inicio de sesión: guarda el código del enlace antes de que se pida entrar
export default function InviteCapture() {
  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "");
    if (!path.endsWith("/unirse")) return;
    const code = decodeURIComponent(window.location.hash.replace(/^#/, "")).trim();
    if (CODE_RE.test(code)) savePending(code);
    // Se quita el código de la barra de direcciones
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  return null;
}