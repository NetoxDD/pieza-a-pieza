export type Folder = { id: string; name: string };

export type Doc = {
  id: string;
  folder_id: string;
  title: string;
  mime: string;
  size_bytes: number;
  thumb_bytes: number;
  storage_path: string;
  thumb_path: string | null;
  document_date: string | null;
  valid_until: string | null;
  notes: string | null;
  uploaded_by: string;
  created_at: string;
};

export const MAX_BYTES = 10 * 1024 * 1024;

export const extOf = (mime: string) =>
  mime === "application/pdf" ? "pdf" : mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";

export const stripExt = (name: string) => name.replace(/\.[^.]+$/, "");

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const toBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp");
  // Algunos navegadores no generan WebP: se usa JPEG
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return blob;
}

async function scaled(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas no disponible");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return encode(canvas, quality);
}

// Reduce la imagen y la vuelve a dibujar: así se pierden los metadatos (ubicación, cámara, fecha)
export async function processImage(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file);
  try {
    const full = await scaled(bitmap, 2000, 0.82);
    const thumb = await scaled(bitmap, 320, 0.75);
    return { full, thumb };
  } finally {
    bitmap.close?.();
  }
}
// ---------- Vigencias ----------
export const SOON_DAYS = 30;

export type Expiry = { state: "none" | "ok" | "soon" | "expired"; days: number };

export function expiryOf(valid: string | null): Expiry {
  if (!valid) return { state: "none", days: 0 };
  const [y, m, d] = valid.split("-").map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((target - today) / 86400000);
  if (days < 0) return { state: "expired", days };
  if (days <= SOON_DAYS) return { state: "soon", days };
  return { state: "ok", days };
}

export function expiryLabel(e: Expiry): string {
  if (e.state === "expired") {
    const n = -e.days;
    return `vencida hace ${n} ${n === 1 ? "día" : "días"}`;
  }
  if (e.days === 0) return "vence hoy";
  if (e.days === 1) return "vence mañana";
  return `vence en ${e.days} días`;
}