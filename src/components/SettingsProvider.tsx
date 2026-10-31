"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  applySettings,
  readLocal,
  systemDefaults,
  writeLocal,
  type Settings,
} from "@/lib/settings";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
};

const SettingsCtx = createContext<Ctx | null>(null);

export function useSettings() {
  const c = useContext(SettingsCtx);
  if (!c) throw new Error("useSettings debe usarse dentro de SettingsProvider");
  return c;
}

async function persist(s: Settings) {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;
  await supabase.from("user_settings").upsert({
    user_id: uid,
    font_scale: s.fontScale,
    contrast: s.contrast,
    calm: s.calm,
    theme: s.theme,
    reading_font: s.font,
    updated_at: new Date().toISOString(),
  });
}

export default function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => readLocal() ?? systemDefaults());

  // Al entrar, los ajustes guardados en la cuenta tienen prioridad
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("user_settings")
        .select("font_scale,contrast,calm,theme,reading_font")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled || !data) return;
      const s: Settings = {
        fontScale: data.font_scale,
        contrast: data.contrast,
        calm: data.calm,
        theme: data.theme,
        font: data.reading_font,
      };
      setSettings(s);
      writeLocal(s);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  // Con el tema automático, sigue los cambios del sistema
  useEffect(() => {
    if (settings.theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applySettings(settings);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [settings]);

  const save = (next: Settings) => {
    setSettings(next);
    writeLocal(next);
    persist(next);
  };

  return (
    <SettingsCtx.Provider
      value={{
        settings,
        update: (patch) => save({ ...settings, ...patch }),
        reset: () => save({ ...systemDefaults(), calm: false }),
      }}
    >
      {children}
    </SettingsCtx.Provider>
  );
}