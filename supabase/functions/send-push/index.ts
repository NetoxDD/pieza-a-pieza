// Edge Function «send-push»: envía las notificaciones push.
//  - kind "message": la llama la base de datos cuando llega un mensaje nuevo.
//  - kind "tick":    la llama pg_cron cada minuto (tomas pendientes y encuentros próximos).
//  - kind "test":    la llama la app (con la sesión de la persona) para probar su propio dispositivo.
// Con {"kind":"tick","dry_run":true} y la clave x-push-secret, solo dice qué enviaría (no envía nada).
//
// Secretos que necesita (Supabase > Edge Functions > Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@correo), PUSH_SECRET, APP_URL,
//   APP_TIMEZONE (por defecto America/Tijuana), JWT_SECRET (solo para tomas y encuentros),
//   PUSH_SHOW_DETAILS=true (opcional: muestra nombres en la notificación; por defecto NO).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const env = (k: string) => Deno.env.get(k) ?? "";
const SUPABASE_URL = env("SUPABASE_URL");
const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = env("SUPABASE_ANON_KEY");
const PUSH_SECRET = env("PUSH_SECRET");
const APP_URL = env("APP_URL").replace(/\/$/, "");
const TZ = env("APP_TIMEZONE") || "America/Tijuana";
const JWT_SECRET = env("JWT_SECRET");
const DETAILS = env("PUSH_SHOW_DETAILS") === "true";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, apikey, x-client-info, x-push-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json" } });

type Payload = { title: string; body: string; url: string; tag: string };
type Planned = { user_id: string; key: string; payload: Payload };

// ---------- Hora local de la app ----------
function localNow(d: Date) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}
const toMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// ---------- Actuar como una persona (para leer con sus permisos) ----------
const b64url = (b: ArrayBuffer | string) =>
  btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function clientAs(userId: string) {
  if (!JWT_SECRET) throw new Error("Falta el secreto JWT_SECRET (Project Settings > API > JWT Secret).");
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({ aud: "authenticated", role: "authenticated", sub: userId, iat: now, exp: now + 300 }));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${head}.${body}`)));
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${head}.${body}.${sig}` } },
  });
}

// ---------- Envío ----------
function initPush() {
  webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@example.com", env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
}

async function deliver(plans: Planned[], useLog: boolean, prefColumn: string | null) {
  let sent = 0;
  const errors: string[] = [];
  for (const pl of plans) {
    if (prefColumn) {
      const { data: pr } = await admin.from("notification_prefs").select(prefColumn).eq("user_id", pl.user_id).maybeSingle();
      if (pr && (pr as Record<string, unknown>)[prefColumn] === false) continue;
    }
    if (useLog) {
      const { error } = await admin.from("push_log").insert({ key: `${pl.key}:${pl.user_id}` });
      if (error) continue; // ya se envió antes
    }
    const { data: subs } = await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", pl.user_id);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(pl.payload),
          { TTL: 3600 },
        );
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
        else errors.push(`${code ?? ""} ${(e as Error).message}`.trim());
      }
    }
  }
  return { sent, errors };
}

// ---------- Mensajes nuevos ----------
async function planMessage(rec: { child_id: string; author_id: string | null }): Promise<Planned[]> {
  const { data: members } = await admin.from("child_members").select("user_id").eq("child_id", rec.child_id);
  const { data: ch } = await admin.from("children").select("name").eq("id", rec.child_id).maybeSingle();
  const { data: au } = rec.author_id
    ? await admin.from("profiles").select("full_name").eq("id", rec.author_id).maybeSingle()
    : { data: null };
  const body = DETAILS
    ? `${au?.full_name ?? "Alguien del equipo"} escribió en el espacio de ${ch?.name ?? "tu niño"}.`
    : "Tienes un mensaje nuevo del equipo.";
  return (members ?? [])
    .filter((m) => m.user_id !== rec.author_id)
    .map((m) => ({
      user_id: m.user_id as string,
      key: `msg:${crypto.randomUUID()}`,
      payload: { title: "Mensaje nuevo", body, url: `${APP_URL}/comunicacion/`, tag: `msg-${rec.child_id}` },
    }));
}

// ---------- Tomas y encuentros (cada minuto) ----------
async function planTick(): Promise<{ plans: Planned[]; notes: string[] }> {
  const plans: Planned[] = [];
  const notes: string[] = [];
  const { data: subs } = await admin.from("push_subscriptions").select("user_id");
  const subscribed = new Set((subs ?? []).map((s) => s.user_id as string));
  if (subscribed.size === 0) return { plans, notes: ["Nadie tiene avisos activados."] };

  const { data: members } = await admin.from("child_members").select("child_id,user_id,role").in("user_id", [...subscribed]);
  const byChild = new Map<string, { user_id: string; role: string }[]>();
  for (const m of members ?? []) {
    const arr = byChild.get(m.child_id as string) ?? [];
    arr.push({ user_id: m.user_id as string, role: m.role as string });
    byChild.set(m.child_id as string, arr);
  }

  const now = new Date();
  const today = localNow(now);
  const yesterday = localNow(new Date(now.getTime() - 86400000)).date;

  for (const [childId, mems] of byChild) {
    // Alguien con permiso para leer este niño (se prefiere la familia)
    const readers = [...mems].sort((a, b) => Number(b.role === "familia") - Number(a.role === "familia"));
    let reader: Awaited<ReturnType<typeof clientAs>>;
    try {
      reader = await clientAs(readers[0].user_id);
    } catch (e) {
      notes.push((e as Error).message);
      return { plans, notes };
    }

    // ----- Tomas pendientes -----
    const sec = await reader.rpc("my_sections", { cid: childId });
    if (!sec.error && (sec.data as { medications?: boolean })?.medications) {
      const meds = await reader.from("child_medications").select("id,name,grace_min").eq("child_id", childId).eq("active", true);
      const slots = await reader.rpc("med_slots", { cid: childId, d_from: yesterday, d_to: today.date, include_inactive: false });
      const since = new Date(now.getTime() - 2 * 86400000).toISOString();
      const doses = await reader
        .from("med_doses")
        .select("medication_id,kind,scheduled_date,scheduled_time,status,postponed_until,voided_at,recorded_at")
        .eq("child_id", childId).gte("recorded_at", since);
      if (meds.error || slots.error || doses.error) {
        notes.push(`Tomas de ${childId}: ${meds.error?.message ?? slots.error?.message ?? doses.error?.message}`);
      } else {
        const live = (doses.data ?? []).filter((d) => !d.voided_at);
        for (const r of slots.data as { medication_id: string; slot_date: string; slot_time: string }[]) {
          if (r.slot_date !== today.date) continue;
          const med = (meds.data ?? []).find((m) => m.id === r.medication_id);
          if (!med) continue;
          const time = r.slot_time.slice(0, 5);
          const mine = live.filter((d) => d.medication_id === med.id && d.kind === "programada" &&
            d.scheduled_date === r.slot_date && String(d.scheduled_time).slice(0, 5) === time);
          if (mine.some((d) => d.status === "dada" || d.status === "omitida")) continue;
          const post = mine.filter((d) => d.status === "pospuesta")
            .sort((a, b) => String(b.recorded_at).localeCompare(String(a.recorded_at)))[0];
          const dueMin = toMin(post?.postponed_until ? String(post.postponed_until) : time);
          const grace = Number(med.grace_min ?? 30);
          const who = mems.filter((m) => m.role !== "pediatra");
          let kind: "due" | "late" | null = null;
          if (today.min >= dueMin + grace && today.min < dueMin + grace + 30) kind = "late";
          else if (today.min >= dueMin && today.min < dueMin + Math.min(grace, 15)) kind = "due";
          if (!kind) continue;
          for (const m of who) {
            plans.push({
              user_id: m.user_id,
              key: `dose:${kind}:${med.id}:${r.slot_date}:${time}:${dueMin}`,
              payload: kind === "due"
                ? { title: "Hora de una toma", body: DETAILS ? `Toca ${med.name} (${time}).` : "Hay una toma pendiente. Regístrala cuando se la den.", url: `${APP_URL}/registro/`, tag: `dose-${med.id}` }
                : { title: "Toma sin registrar", body: DETAILS ? `${med.name} de las ${time} no está registrada.` : "Una toma no se ha registrado todavía. Revisa si ya se la dieron.", url: `${APP_URL}/registro/`, tag: `dose-${med.id}` },
            });
          }
        }
      }
    }

    // ----- Encuentros próximos (30 minutos antes) -----
    const evs = await reader.rpc("event_occurrences", { cid: childId, d_from: today.date, d_to: today.date });
    if (evs.error) {
      notes.push(`Encuentros de ${childId}: ${evs.error.message}`);
    } else {
      for (const e of evs.data as { event_id: string; occ_date: string; event_time: string | null; title: string }[]) {
        if (!e.event_time) continue;
        const start = toMin(e.event_time);
        if (today.min >= start - 30 && today.min < start) {
          for (const m of mems) {
            plans.push({
              user_id: m.user_id,
              key: `event:${e.event_id}:${e.occ_date}`,
              payload: { title: "Encuentro pronto", body: DETAILS ? `${e.title} a las ${e.event_time.slice(0, 5)}.` : "Tienes un encuentro en menos de 30 minutos.", url: `${APP_URL}/calendario/`, tag: `event-${e.event_id}` },
            });
          }
        }
      }
    }
  }
  return { plans, notes };
}

// ---------- Entrada ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Usa POST." }, 405);

  let body: { kind?: string; record?: { child_id: string; author_id: string | null }; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* sin cuerpo */ }

  const trusted = PUSH_SECRET !== "" && req.headers.get("x-push-secret") === PUSH_SECRET;

  try {
    if (trusted && body.kind === "message" && body.record) {
      initPush();
      const plans = await planMessage(body.record);
      return json(await deliver(plans, false, "messages"));
    }

    if (trusted && body.kind === "tick") {
      const { plans, notes } = await planTick();
      if (body.dry_run) return json({ dry_run: true, would_send: plans.length, plans, notes });
      initPush();
      // Cada plan lleva su propio tipo de preferencia
      const doses = plans.filter((p) => p.key.startsWith("dose:"));
      const events = plans.filter((p) => p.key.startsWith("event:"));
      const a = await deliver(doses, true, "doses");
      const b = await deliver(events, true, "events");
      return json({ sent: a.sent + b.sent, errors: [...a.errors, ...b.errors], notes });
    }

    if (body.kind === "test") {
      const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await admin.auth.getUser(token);
      if (!u?.user) return json({ error: "Inicia sesión para probar." }, 401);
      initPush();
      const r = await deliver(
        [{ user_id: u.user.id, key: "test", payload: { title: "Pieza a pieza", body: "¡Los avisos funcionan en este dispositivo!", url: `${APP_URL}/ajustes/`, tag: "test" } }],
        false, null,
      );
      return json(r);
    }

    return json({ error: "No autorizado o tipo desconocido." }, 401);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
