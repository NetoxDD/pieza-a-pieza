// Pruebas de permisos por rol contra las cuentas demo.
// Uso:   npm run test:permisos
// Necesita NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_KEY (en .env.local o en el entorno)
// y los datos de demo cargados (demo_seed.sql). No borra nada.
//
// Qué revisa:
//  1. Sin iniciar sesión no se puede leer ninguna tabla.
//  2. Lo que la app dice que cada rol puede ver (my_sections) coincide con lo que la base entrega de verdad.
//  3. Los roles que NO son familia no pueden cambiar datos del niño ni de los miembros.
//  4. Nadie puede dar una medicina que no tiene permiso de administrar.
//  5. Los registros de dosis no se pueden modificar.
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_KEY (revisa .env.local).");
  process.exit(2);
}

const CHILD = "c0000000-0000-4000-8000-000000000001";
const PASSWORD = "Demo1234!";
const ACCOUNTS = [
  [1, "familia"], [2, "pediatra"], [3, "pediatra"], [4, "tutor"], [5, "tutor"],
  [6, "familia"], [7, "familia"], [8, "logopeda"], [9, "logopeda"],
];

// Qué tablas debe esconder cada sección cuando la persona no tiene acceso
const SECTION_TABLES = {
  medications: ["child_medications", "med_doses", "med_stock_ledger"],
  conditions: ["child_conditions"],
  wellbeing: ["sleep_logs", "meal_logs"],
  episodes: ["episodes"],
};

const ANON_TABLES = [
  "profiles", "children", "child_members", "child_profile", "child_allergies", "child_contacts", "child_conditions",
  "child_medications", "med_doses", "med_stock_ledger", "observations", "observation_photos", "observation_versions",
  "mood_logs", "sleep_logs", "meal_logs", "episodes", "routines", "routine_steps", "routine_step_done", "goals",
  "calm_plan_items", "events", "materials", "documents", "messages", "notebook_entries", "achievements",
  "child_invites", "audit_log", "user_settings",
];

let fails = 0;
let warns = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { fails++; console.log(`  ✗ ${m}`); };
const warn = (m) => { warns++; console.log(`  ! ${m}`); };
const mk = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

// ---------- 1. Sin sesión ----------
console.log("\nSin iniciar sesión");
{
  const anon = mk();
  let leaked = [];
  for (const t of ANON_TABLES) {
    const { data, error } = await anon.from(t).select("*").limit(1);
    if (!error && data && data.length > 0) leaked.push(t);
  }
  leaked.length ? bad(`Se pudo leer sin sesión: ${leaked.join(", ")}`) : ok(`${ANON_TABLES.length} tablas sin lectura anónima`);
}

const matrix = [];

// ---------- 2 a 5. Por cuenta ----------
for (const [n, role] of ACCOUNTS) {
  const email = `demo${n}@gmail.com`;
  console.log(`\n${email} (${role})`);
  const sb = mk();
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (authErr || !auth.user) { bad(`No pudo iniciar sesión: ${authErr?.message}`); continue; }
  const uid = auth.user.id;

  const child = await sb.from("children").select("id,name").eq("id", CHILD).maybeSingle();
  child.data ? ok("Ve el espacio de Cesar") : bad("No ve el espacio de Cesar");

  const sec = await sb.rpc("my_sections", { cid: CHILD });
  if (sec.error) { bad(`my_sections falló: ${sec.error.message}`); continue; }
  const acc = sec.data;
  matrix.push([email, role, acc]);

  // La app y la base tienen que estar de acuerdo
  for (const [section, tables] of Object.entries(SECTION_TABLES)) {
    for (const t of tables) {
      const { data, error } = await sb.from(t).select("*", { count: "exact" }).eq("child_id", CHILD).limit(1);
      const rows = error ? 0 : data.length;
      if (!acc[section] && rows > 0) bad(`${t}: la app dice que NO ve «${section}», pero la base le entrega datos`);
      else if (acc[section] && rows === 0 && !error) warn(`${t}: ve «${section}» pero no hay filas (¿falta el seed?)`);
      else if (acc[section] && error) bad(`${t}: tiene acceso a «${section}» pero la consulta falla (${error.message})`);
    }
  }
  ok(`Acceso por sección: ${Object.entries(acc).filter(([, v]) => v).map(([k]) => k).join(", ") || "ninguna"}`);

  // Los que no son familia no pueden cambiar al niño ni a los miembros (se reescribe el mismo valor: no cambia nada)
  if (role !== "familia") {
    const upd = await sb.from("children").update({ name: child.data?.name }).eq("id", CHILD).select("id");
    !upd.error && upd.data?.length ? bad("Puede modificar los datos del niño") : ok("No puede modificar los datos del niño");

    const mem = await sb.from("child_members").select("role").eq("child_id", CHILD).eq("user_id", uid).maybeSingle();
    const upm = await sb.from("child_members").update({ role: mem.data?.role }).eq("child_id", CHILD).eq("user_id", uid).select("user_id");
    !upm.error && upm.data?.length ? bad("Puede modificar la lista de miembros (¡podría subirse de rol!)") : ok("No puede modificar la lista de miembros");

    const inv = await sb.from("child_invites").select("*").eq("child_id", CHILD).limit(1);
    !inv.error && inv.data?.length ? bad("Ve las invitaciones del espacio") : ok("No ve las invitaciones del espacio");
  }

  // Dosis: nadie da lo que no puede administrar
  if (acc.medications) {
    const meds = await sb.from("child_medications").select("id,name").eq("child_id", CHILD).eq("active", true);
    const adm = await sb.rpc("my_administrable", { cid: CHILD });
    const allowed = new Set((adm.data ?? []).map((x) => x.medication_id));
    const blocked = (meds.data ?? []).filter((m) => !allowed.has(m.id));
    if (blocked.length === 0) ok(allowed.size ? "Puede administrar todas las medicinas activas" : "Sin medicinas activas");
    for (const m of blocked) {
      const d = new Date();
      const ins = await sb.from("med_doses").insert({
        medication_id: m.id, child_id: CHILD, kind: "programada",
        scheduled_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        scheduled_time: "03:15", status: "dada", taken_at: d.toISOString(), note: "PRUEBA DE PERMISOS",
      });
      ins.error
        ? ok(`No puede dar ${m.name} (${ins.error.message.slice(0, 70)})`)
        : bad(`Pudo registrar una dosis de ${m.name} sin permiso. Corre demo_cleanup.sql y demo_seed.sql para limpiar`);
    }

    // Las dosis no se editan (se reescribe el mismo valor)
    const one = await sb.from("med_doses").select("id,note").eq("child_id", CHILD).limit(1).maybeSingle();
    if (one.data) {
      const up = await sb.from("med_doses").update({ note: one.data.note }).eq("id", one.data.id).select("id");
      !up.error && up.data?.length ? bad("Puede modificar un registro de dosis (debería ser inmutable)") : ok("No puede modificar registros de dosis");
    }
  }
  await sb.auth.signOut();
}

// ---------- Resumen ----------
console.log("\nQuién ve qué");
const cols = ["medications", "conditions", "contacts", "wellbeing", "episodes"];
console.log(["cuenta".padEnd(20), "rol".padEnd(10), ...cols.map((c) => c.slice(0, 10).padEnd(10))].join(" "));
for (const [email, role, acc] of matrix) {
  console.log([email.padEnd(20), role.padEnd(10), ...cols.map((c) => (acc[c] ? "sí" : "-").padEnd(10))].join(" "));
}
console.log(`\n${fails === 0 ? "TODO BIEN" : "HAY FALLOS"}: ${fails} fallo(s), ${warns} aviso(s).`);
process.exit(fails ? 1 : 0);
