// Recorta al centro en cuadrado, reduce y vuelve a dibujar la imagen.
// Al redibujarla se pierden los metadatos (ubicación, cámara, fecha...).
export async function resizeToSquare(file: File, size = 256): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas no disponible");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85)
  );
  if (!blob) throw new Error("no se pudo generar la imagen");
  return blob;
}