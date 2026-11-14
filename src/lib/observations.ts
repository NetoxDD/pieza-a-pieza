import { supabase } from "@/lib/supabase";

export const CATEGORIES = ["Comunicación", "Apoyos sensoriales", "Rutinas", "Disfrute"] as const;
export type Category = (typeof CATEGORIES)[number];

export const TAGS = [
  "ruido",
  "multitud",
  "cambio de rutina",
  "comida",
  "sueño",
  "logro",
  "terapia",
  "escuela",
  "salud",
  "emociones",
  "sensorial",
  "juego",
  "comunicación",
  "transición",
] as const;
export const MAX_TAGS = 5;
export const tagLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 1572864; // 1.5 MB
export const BUCKET = "obs-photos";

export type Obs = {
  id: string;
  author_id: string;
  category: Category;
  body: string;
  tags: string[];
  created_at: string;
  edited_at: string | null;
  include_in_report: boolean;
};

export type Photo = {
  id: string;
  observation_id: string;
  storage_path: string;
  thumb_path: string;
  size_bytes: number;
  thumb_bytes: number;
  uploaded_by: string;
};

export const OBS_COLS = "id,author_id,category,body,tags,created_at,edited_at,include_in_report";
export const PHOTO_COLS = "id,observation_id,storage_path,thumb_path,size_bytes,thumb_bytes,uploaded_by";

// Búsqueda sin importar mayúsculas ni acentos
export const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const sameTags = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

// ---------- Fotos: se reducen y se vuelven a dibujar (así pierden ubicación y datos ocultos) ----------
function draw(bitmap: ImageBitmap, maxSide: number) {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const toBlob = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  let blob = await toBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("encode");
  return blob;
}

export async function processObsPhoto(file: File): Promise<{ full: Blob; thumb: Blob }> {
  if (!file.type.startsWith("image/")) throw new Error("Solo se admiten imágenes");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("No se pudo leer esa imagen");
  }
  try {
    const big = draw(bitmap, 1600);
    let full = await encode(big, 0.8);
    for (let q = 0.7; full.size > MAX_PHOTO_BYTES - 50000 && q >= 0.4; q -= 0.1) {
      full = await encode(big, q);
    }
    if (full.size > MAX_PHOTO_BYTES) throw new Error("La foto es demasiado pesada");
    const thumb = await encode(draw(bitmap, 320), 0.7);
    return { full, thumb };
  } finally {
    bitmap.close?.();
  }
}

const ext = (b: Blob) => (b.type === "image/webp" ? "webp" : "jpg");

// Devuelve cuántas fotos no se pudieron subir
export async function uploadObsPhotos(childId: string, obsId: string, files: File[]): Promise<number> {
  let failed = 0;
  for (const file of files) {
    try {
      const { full, thumb } = await processObsPhoto(file);
      const base = `${childId}/${obsId}/${crypto.randomUUID()}`;
      const fullPath = `${base}.${ext(full)}`;
      const thumbPath = `${base}-t.${ext(thumb)}`;
      const bucket = supabase.storage.from(BUCKET);

      const a = await bucket.upload(fullPath, full, { contentType: full.type });
      if (a.error) throw a.error;
      const b = await bucket.upload(thumbPath, thumb, { contentType: thumb.type });
      if (b.error) {
        await bucket.remove([fullPath]);
        throw b.error;
      }
      const row = await supabase.from("observation_photos").insert({
        observation_id: obsId,
        child_id: childId,
        storage_path: fullPath,
        thumb_path: thumbPath,
        size_bytes: full.size,
        thumb_bytes: thumb.size,
      });
      if (row.error) {
        await bucket.remove([fullPath, thumbPath]);
        throw row.error;
      }
    } catch {
      failed++;
    }
  }
  return failed;
}

export async function removeObsFiles(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  return !error;
}

export async function removeObsPhoto(p: Photo): Promise<boolean> {
  if (!(await removeObsFiles([p.storage_path, p.thumb_path]))) return false;
  const { data, error } = await supabase.from("observation_photos").delete().eq("id", p.id).select("id");
  return !error && !!data?.length;
}

export async function signedMap(paths: string[], seconds = 600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, seconds);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}