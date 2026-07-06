export const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB

// Mirrors the formats sniff-mime.ts can detect. Anything else is rejected server-side.
export const ALLOWED_PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);
export const ALLOWED_VIDEO_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

// Formats a canvas can decode/re-encode client-side — used to decide whether a photo
// can be auto-compressed before upload (HEIC can't be decoded by stock browser canvas,
// so it uploads as-is; it's already a space-efficient format).
export const CANVAS_DECODABLE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Every canvas-decodable photo is downsized to fit this before upload — faster uploads
// on real networks, and keeps R2 storage well within the free tier at ~100 photos/week.
// Chosen with the user: less aggressive than the ~1600px used for the tagging pipeline
// (Milestone 5), since this is the asset actually kept in the library, not a model input.
export const UPLOAD_MAX_DIMENSION = 2400;
export const UPLOAD_JPEG_QUALITY = 0.85;
