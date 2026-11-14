import { supabase } from "@/lib/supabase";

export type Rows = Record<string, unknown>[] | { error: string };

// Tablas sin columna "id": se ordenan por otra columna
const ORDER: Record<string, string> = {
  child_profile: "child_id",
  child_conditions: "child_id",
  profile_contacts: "user_id",
  user_settings: "user_id",
  child_members: "user_id",
  material_likes: "material_id",
  med_administer_roles: "medication_id",
  calm_plan_settings: "child_id",
};

// Trae todas las filas visibles para esta persona, de mil en mil
async function grab(table: string, column: string, value: string | string[]): Promise<Rows> {
  if (Array.isArray(value) && value.length === 0) return [];
  const PAGE = 1000;
  const all: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const base = supabase.from(table).select("*");
    const filtered = Array.isArray(value) ? base.in(column, value) : base.eq(column, value);
    const { data, error } = await filtered.order(ORDER[table] ?? "id").range(from, from + PAGE - 1);
    if (error) return { error: "sin acceso o no disponible" };
    all.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE) break;
  }
  return all;
}

const idsOf = (rows: Rows | undefined, key = "id") =>
  Array.isArray(rows) ? rows.map((r) => r[key]).filter((x): x is string => typeof x === "string") : [];

// Solo lo que es de esta persona
export async function exportMine(userId: string) {
  const spec: [string, string][] = [
    ["profiles", "id"],
    ["profile_contacts", "user_id"],
    ["user_settings", "user_id"],
    ["child_members", "user_id"],
    ["observations", "author_id"],
    ["messages", "author_id"],
    ["mood_logs", "author_id"],
    ["med_doses", "recorded_by"],
    ["routine_step_done", "done_by"],
    ["materials", "author_id"],
    ["material_likes", "user_id"],
    ["documents", "uploaded_by"],
    ["events", "created_by"],
    ["goals", "created_by"],
  ];
  const datos: Record<string, Rows> = {};
  for (const [table, column] of spec) datos[table] = await grab(table, column, userId);
  return { tipo: "mis-datos", generado: new Date().toISOString(), usuario: userId, datos };
}

// Todo lo del niño (solo el familiar principal)
export async function exportSpace(childId: string) {
  const datos: Record<string, Rows> = {};
  datos.children = await grab("children", "id", childId);

  const byChild = [
    "child_profile",
    "child_allergies",
    "child_contacts",
    "child_medications",
    "child_conditions",
    "child_section_access",
    "med_doses",
    "med_stock_ledger",
    "med_schedule_history",
    "observations",
    "observation_versions",
    "observation_photos",
    "mood_logs",
    "goals",
    "events",
    "messages",
    "routines",
    "document_folders",
    "documents",
    "materials",
    "child_members",
    "audit_log",
    "sleep_logs",
    "meal_logs",
    "calm_plan_items",
    "calm_plan_settings",
    "episodes",
    "notebook_entries",
  ];
  for (const table of byChild) datos[table] = await grab(table, "child_id", childId);

  datos.goal_supports = await grab("goal_supports", "goal_id", idsOf(datos.goals));
  datos.routine_steps = await grab("routine_steps", "routine_id", idsOf(datos.routines));
  datos.routine_step_done = await grab("routine_step_done", "step_id", idsOf(datos.routine_steps));
  datos.med_administer_roles = await grab("med_administer_roles", "medication_id", idsOf(datos.child_medications));
  datos.document_folder_access = await grab("document_folder_access", "folder_id", idsOf(datos.document_folders));

  const people = await grab("profiles", "id", idsOf(datos.child_members, "user_id"));
  datos.equipo_nombres = Array.isArray(people)
    ? people.map((p) => ({ id: p.id, nombre: p.full_name }))
    : people;

  return { tipo: "espacio", generado: new Date().toISOString(), espacio: childId, datos };
}

export function countRows(datos: Record<string, Rows>) {
  return Object.values(datos).reduce((n, v) => n + (Array.isArray(v) ? v.length : 0), 0);
}

// Descarga un JSON (el nombre no incluye datos personales)
export function download(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}