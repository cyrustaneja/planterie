// Detects real file type from magic bytes rather than filename/extension — required for
// the "HEIC with no extension" case (PRD.md Section 8.5) and safer in general, since a
// client-declared Content-Type or filename can't be trusted server-side.

export type MediaKind = "photo" | "video";

export interface SniffedMedia {
  mime: string;
  kind: MediaKind;
}

const HEIC_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

const MP4_BRANDS = new Set([
  "isom",
  "iso2",
  "iso3",
  "iso4",
  "iso5",
  "iso6",
  "mp41",
  "mp42",
  "avc1",
  "3gp4",
  "3gp5",
  "M4V ",
  "M4A ",
]);

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  if (bytes.length < start + length) return "";
  let out = "";
  for (let i = start; i < start + length; i++) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

function matchesPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((byte, index) => bytes[index] === byte);
}

// ISO base media file format container (HEIC, MP4, MOV all use this box structure):
// bytes 4-7 are "ftyp", bytes 8-11 are the brand that identifies the specific format.
function sniffIsoBmff(bytes: Uint8Array): SniffedMedia | null {
  if (readAscii(bytes, 4, 4) !== "ftyp") return null;
  const brand = readAscii(bytes, 8, 4);

  if (HEIC_BRANDS.has(brand)) return { mime: "image/heic", kind: "photo" };
  if (brand === "qt  ") return { mime: "video/quicktime", kind: "video" };
  if (MP4_BRANDS.has(brand)) return { mime: "video/mp4", kind: "video" };

  return null;
}

export function sniffMimeType(bytes: Uint8Array): SniffedMedia | null {
  if (matchesPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return { mime: "image/jpeg", kind: "photo" };
  }
  if (matchesPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mime: "image/png", kind: "photo" };
  }
  if (readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP") {
    return { mime: "image/webp", kind: "photo" };
  }
  if (matchesPrefix(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
    return { mime: "video/webm", kind: "video" };
  }

  const isoBmff = sniffIsoBmff(bytes);
  if (isoBmff) return isoBmff;

  return null;
}
