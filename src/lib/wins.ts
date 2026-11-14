import { supabase } from "@/lib/supabase";
import { processObsPhoto } from "@/lib/observations";

export const WIN_BUCKET = "wins-photos";

export const AREAS = [
  { key: "comunicacion", label: "Comunicación", emoji: "💬" },
  { key: "autonomia", label: "Autonomía", emoji: "🌱" },
  { key: "social", label: "Social", emoji: "🤝" },
  { key: "juego", label: "Juego", emoji: "🧩" },
  { key: "escuela", label: "Escuela", emoji: "🎒" },
  { key: "otro", label: "Otro", emoji: "⭐" },
] as const;

export const areaOf = (k: string) => AREAS.find((a) => a.key === k) ?? AREAS[AREAS.length - 1];

export type Win = {
  id: string;
  author_id: string;
  achieved_on: string;
  area: string;
  title: string;
  note: string | null;
  goal_id: string | null;
  show_to_child: boolean;
  photo_path: string | null;
  thumb_path: string | null;
  created_at: string;
};

export const WIN_COLS =
  "id,author_id,achieved_on,area,title,note,goal_id,show_to_child,photo_path,thumb_path,created_at";

const ext = (b: Blob) => (b.type === "image/webp" ? "webp" : "jpg");

export async function uploadWinPhoto(childId: string, winId: string, file: File): Promise<boolean> {
  try {
    const { full, thumb } = await processObsPhoto(file);
    const base = `${childId}/${winId}/${crypto.randomUUID()}`;
    const fp = `${base}.${ext(full)}`;
    const tp = `${base}-t.${ext(thumb)}`;
    const bucket = supabase.storage.from(WIN_BUCKET);

    const a = await bucket.upload(fp, full, { contentType: full.type });
    if (a.error) throw a.error;
    const b = await bucket.upload(tp, thumb, { contentType: thumb.type });
    if (b.error) {
      await bucket.remove([fp]);
      throw b.error;
    }
    const u = await supabase
      .from("achievements")
      .update({ photo_path: fp, thumb_path: tp, photo_bytes: full.size, thumb_bytes: thumb.size })
      .eq("id", winId)
      .select("id");
    if (u.error || !u.data?.length) {
      await bucket.remove([fp, tp]);
      throw new Error("update");
    }
    return true;
  } catch {
    return false;
  }
}

export async function removeWinFiles(win: Win): Promise<boolean> {
  if (!win.photo_path || !win.thumb_path) return true;
  const { error } = await supabase.storage.from(WIN_BUCKET).remove([win.photo_path, win.thumb_path]);
  return !error;
}

// Quita la foto de un logro (archivos y datos)
export async function removeWinPhoto(win: Win): Promise<boolean> {
  if (!(await removeWinFiles(win))) return false;
  const { data, error } = await supabase
    .from("achievements")
    .update({ photo_path: null, thumb_path: null, photo_bytes: null, thumb_bytes: null })
    .eq("id", win.id)
    .select("id");
  return !error && !!data?.length;
}

export async function signedWins(paths: string[], seconds = 600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(WIN_BUCKET).createSignedUrls(paths, seconds);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}

const KNOWN = ["Esa fecha", "Esos datos", "Solo quien", "Solo la familia", "Ese objetivo", "Se alcanzó"];
export function winError(e: { message?: string } | null, fallback = "No se pudo guardar. Revisa tus permisos e intenta de nuevo.") {
  return e?.message && KNOWN.some((k) => e.message!.startsWith(k)) ? e.message : fallback;
}