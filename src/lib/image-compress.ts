// Compresses an image client-side into a data URL small enough to store as a
// single Firestore field (max doc size 1 MiB) — used instead of Firebase
// Storage, which now requires the paid Blaze plan.
export async function compressImageToDataUrl(
  file: File,
  { maxDimension = 1400, maxBytes = 700_000 } = {}
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas wird nicht unterstützt");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.8;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length * 0.75 > maxBytes && quality > 0.3) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length * 0.75 > maxBytes) {
    throw new Error(
      "Das Bild ist auch komprimiert noch zu groß. Bitte ein kleineres Bild verwenden."
    );
  }

  return dataUrl;
}
