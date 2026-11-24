"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useChild } from "@/components/ChildGate";
import {
  VAPID_PUBLIC_KEY,
  currentSubscription,
  disablePush,
  enablePush,
  pushAvailableHere,
  pushSupported,
  sendTestPush,
} from "@/lib/push";

type Prefs = { doses: boolean; events: boolean; messages: boolean };
const DEFAULTS: Prefs = { doses: true, events: true, messages: true };

const OPTIONS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "doses", label: "Tomas de medicina", hint: "Cuando llega la hora y cuando una toma queda sin registrar." },
  { key: "events", label: "Encuentros y citas", hint: "Media hora antes de cada encuentro del calendario." },
  { key: "messages", label: "Mensajes del equipo", hint: "Cuando alguien escribe en el espacio." },
];

export default function PushSettings() {
  const { userId } = useChild();
  const supported = pushSupported();
  const here = pushAvailableHere();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [denied, setDenied] = useState(
    () => typeof Notification !== "undefined" && Notification.permission === "denied"
  );

  useEffect(() => {
    if (!supported || !here) return;
    let off = false;
    (async () => {
      const [sub, pr] = await Promise.all([
        currentSubscription().catch(() => null),
        supabase.from("notification_prefs").select("doses,events,messages").eq("user_id", userId).maybeSingle(),
      ]);
      if (off) return;
      setSubscribed(!!sub);
      if (pr.data) setPrefs(pr.data as Prefs);
    })();
    return () => {
      off = true;
    };
  }, [supported, here, userId]);

  const savePrefs = async (next: Prefs) => {
    setPrefs(next);
    const { error } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
    if (error) setMsg("No se pudo guardar tu elección de avisos.");
  };

  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    try {
      await enablePush(userId);
      setSubscribed(true);
      setDenied(false);
      setMsg("Avisos activados en este dispositivo.");
    } catch (e) {
      const m = (e as Error).message;
      if (m === "denied") {
        setDenied(true);
        setMsg("");
      } else if (m === "not-configured") setMsg("Los avisos todavía no están configurados en esta versión de la app.");
      else setMsg("No se pudieron activar los avisos. Intenta de nuevo.");
    }
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    setMsg("");
    try {
      await disablePush();
      setSubscribed(false);
      setMsg("Avisos desactivados en este dispositivo.");
    } catch {
      setMsg("No se pudo desactivar. Intenta de nuevo.");
    }
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMsg("");
    const r = await sendTestPush();
    setMsg(r.message);
    setBusy(false);
  };

  const btn =
    "min-h-11 rounded-xl px-5 text-sm font-bold disabled:opacity-60";

  return (
    <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {subscribed ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
        Avisos en este dispositivo
      </h2>
      <p className="text-sm text-[var(--muted)]">
        Recibe un aviso aunque la app esté cerrada. Por privacidad, la notificación no muestra nombres ni medicinas en la pantalla bloqueada.
      </p>

      {!supported && (
        <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          Este navegador no permite avisos. En iPhone o iPad, primero abre la app desde «Añadir a pantalla de inicio» (iOS 16.4 o más reciente).
        </p>
      )}
      {supported && !here && (
        <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          Los avisos solo funcionan en la versión publicada de la app, no en la de pruebas.
        </p>
      )}
      {supported && here && !VAPID_PUBLIC_KEY && (
        <p className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          Los avisos todavía no están configurados en esta versión de la app.
        </p>
      )}
      {supported && here && VAPID_PUBLIC_KEY && denied && (
        <p role="alert" className="rounded-xl bg-[var(--sand)] p-4 text-sm text-[var(--sand-text)]">
          Los avisos están bloqueados en este navegador. Para activarlos, permite las notificaciones de este sitio en la configuración del navegador y vuelve a intentar.
        </p>
      )}

      {supported && here && VAPID_PUBLIC_KEY && subscribed === false && !denied && (
        <div>
          <button type="button" onClick={turnOn} disabled={busy} className={`${btn} bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]`}>
            Activar avisos
          </button>
        </div>
      )}

      {supported && here && VAPID_PUBLIC_KEY && subscribed && (
        <>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Quiero recibir avisos de</legend>
            {OPTIONS.map((o) => (
              <label key={o.key} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3 hover:bg-[var(--sage)]">
                <input
                  type="checkbox"
                  checked={prefs[o.key]}
                  onChange={(e) => savePrefs({ ...prefs, [o.key]: e.target.checked })}
                  className="mt-1 h-5 w-5 accent-[var(--primary)]"
                />
                <span>
                  <strong className="block text-sm">{o.label}</strong>
                  <span className="text-sm text-[var(--muted)]">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={test} disabled={busy} className={`${btn} bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]`}>
              Enviar aviso de prueba
            </button>
            <button type="button" onClick={turnOff} disabled={busy} className={`${btn} border border-[var(--border)] hover:bg-[var(--sage)]`}>
              Desactivar en este dispositivo
            </button>
          </div>
        </>
      )}

      {msg && (
        <p role="status" className="text-sm font-medium text-[var(--primary)]">
          {msg}
        </p>
      )}
    </section>
  );
}
