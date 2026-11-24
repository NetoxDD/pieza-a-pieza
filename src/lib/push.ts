"use client";

import { supabase } from "@/lib/supabase";

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// En local el service worker no se registra, así que los avisos solo funcionan en la versión publicada
export const pushAvailableHere = () => process.env.NODE_ENV === "production";

function keyToBytes(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function enablePush(userId: string) {
  if (!VAPID_PUBLIC_KEY) throw new Error("not-configured");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    }));
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: j.endpoint,
      p256dh: j.keys?.p256dh,
      auth: j.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<{ ok: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke("send-push", { body: { kind: "test" } });
  if (error) return { ok: false, message: "No se pudo contactar al servicio de avisos." };
  const r = data as { sent?: number; error?: string; errors?: string[] };
  if (r.error) return { ok: false, message: r.error };
  if (!r.sent) return { ok: false, message: r.errors?.[0] ?? "El aviso no llegó a ningún dispositivo." };
  return { ok: true, message: "Enviado. Debería llegarte en unos segundos." };
}
