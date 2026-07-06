import {
  CANVAS_DECODABLE_MIME_TYPES,
  MAX_PHOTO_BYTES,
  UPLOAD_JPEG_QUALITY,
  UPLOAD_MAX_DIMENSION,
} from "@/lib/media/limits";

const FALLBACK_QUALITY_STEPS = [0.7, 0.5];
const FALLBACK_SCALE_STEP = 0.8;
const MAX_FALLBACK_ITERATIONS = 3;

function scaledToFit(width: number, height: number, maxDimension: number) {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

// Every canvas-decodable photo is downsized to UPLOAD_MAX_DIMENSION before upload —
// faster uploads on real networks, and keeps R2 storage within the free tier at scale.
// HEIC/HEIF isn't canvas-decodable in Chrome/Firefox, so it's passed through untouched;
// it's already a space-efficient format. Never blocks the upload: if a huge image still
// doesn't fit under MAX_PHOTO_BYTES after resizing, this returns the best attempt with a
// console warning rather than throwing.
export async function compressImageToFit(file: File, maxBytes = MAX_PHOTO_BYTES): Promise<Blob> {
  if (!CANVAS_DECODABLE_MIME_TYPES.has(file.type)) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let { width, height } = scaledToFit(bitmap.width, bitmap.height, UPLOAD_MAX_DIMENSION);
  let best = await encode(bitmap, width, height, UPLOAD_JPEG_QUALITY);

  for (
    let iteration = 0;
    best.size > maxBytes && iteration < MAX_FALLBACK_ITERATIONS;
    iteration++
  ) {
    for (const quality of FALLBACK_QUALITY_STEPS) {
      const attempt = await encode(bitmap, width, height, quality);
      if (attempt.size < best.size) best = attempt;
      if (attempt.size <= maxBytes) {
        bitmap.close();
        return attempt;
      }
    }
    width = Math.round(width * FALLBACK_SCALE_STEP);
    height = Math.round(height * FALLBACK_SCALE_STEP);
  }

  bitmap.close();
  if (best.size > maxBytes) {
    console.warn("compressImageToFit: could not get under the size cap, uploading best attempt", {
      filename: file.name,
      originalBytes: file.size,
      bestAttemptBytes: best.size,
      maxBytes,
    });
  }
  return best;
}
