import { supabase } from "@/lib/supabase";

// Todos los archivos de un espacio viven bajo "{id del niño}/..."
const BUCKETS = ["documents", "materials", "child-photos"];

async function listAll(bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, { limit: 100, offset });
    if (error) throw new Error("list");
    const files = (data ?? []).filter((f) => f.id); // las subcarpetas no tienen id
    out.push(...files.map((f) => `${folder}/${f.name}`));
    if (!data || data.length < 100) break;
  }
  return out;
}

async function removeAll(bucket: string, paths: string[]) {
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { data, error } = await supabase.storage.from(bucket).remove(batch);
    // Si una regla impide borrar, no devuelve error: devuelve menos archivos de los pedidos
    if (error || (data?.length ?? 0) < batch.length) {
      throw new Error(
        "No se pudieron borrar todos los archivos. El espacio no se eliminó: intenta de nuevo."
      );
    }
  }
}

export async function deleteSpace(childId: string, confirmName: string) {
  // 1. Se listan los archivos de los tres almacenes (si algo falla aquí, no se ha borrado nada)
  const found: [string, string[]][] = [];
  for (const bucket of BUCKETS) {
    try {
      found.push([bucket, await listAll(bucket, childId)]);
    } catch {
      throw new Error("No se pudieron revisar los archivos del espacio. No se borró nada.");
    }
  }

  // 2. Se borran los archivos
  for (const [bucket, paths] of found) {
    if (paths.length > 0) await removeAll(bucket, paths);
  }

  // 3. Se borran todos los datos, y se comprueba otra vez el nombre
  const { error } = await supabase.rpc("delete_space", { cid: childId, confirm_name: confirmName });
  if (error) {
    const known = ["El nombre", "Solo el familiar"];
    throw new Error(
      known.some((k) => error.message.startsWith(k))
        ? error.message
        : "Se borraron los archivos, pero no se pudo eliminar el espacio. Avísame para revisarlo."
    );
  }
}