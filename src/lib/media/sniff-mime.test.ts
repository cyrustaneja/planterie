import { describe, expect, it } from "vitest";
import { sniffMimeType } from "@/lib/media/sniff-mime";

function bytesFrom(values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function asciiBytes(str: string): number[] {
  return Array.from(str).map((c) => c.charCodeAt(0));
}

describe("sniffMimeType", () => {
  it("detects JPEG from its magic bytes", () => {
    expect(sniffMimeType(bytesFrom([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]))).toEqual({
      mime: "image/jpeg",
      kind: "photo",
    });
  });

  it("detects PNG from its magic bytes", () => {
    expect(
      sniffMimeType(bytesFrom([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])),
    ).toEqual({ mime: "image/png", kind: "photo" });
  });

  it("detects WEBP via the RIFF....WEBP structure", () => {
    const bytes = bytesFrom([...asciiBytes("RIFF"), 0x00, 0x00, 0x00, 0x00, ...asciiBytes("WEBP")]);
    expect(sniffMimeType(bytes)).toEqual({ mime: "image/webp", kind: "photo" });
  });

  it("detects WEBM via the EBML header", () => {
    expect(sniffMimeType(bytesFrom([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00]))).toEqual({
      mime: "video/webm",
      kind: "video",
    });
  });

  it("detects HEIC from an ftyp box with a HEIC brand, with no filename involved", () => {
    // This is the exact "HEIC with no extension" case PRD.md/CLAUDE.md call out —
    // detection here comes entirely from bytes, never from a filename.
    const bytes = bytesFrom([
      0x00,
      0x00,
      0x00,
      0x18,
      ...asciiBytes("ftyp"),
      ...asciiBytes("heic"),
      0x00,
      0x00,
      0x00,
      0x00,
    ]);
    expect(sniffMimeType(bytes)).toEqual({ mime: "image/heic", kind: "photo" });
  });

  it("detects MP4 from an ftyp box with an isom/mp42 brand", () => {
    const bytes = bytesFrom([0x00, 0x00, 0x00, 0x18, ...asciiBytes("ftyp"), ...asciiBytes("mp42")]);
    expect(sniffMimeType(bytes)).toEqual({ mime: "video/mp4", kind: "video" });
  });

  it("detects MOV from an ftyp box with the qt brand", () => {
    const bytes = bytesFrom([0x00, 0x00, 0x00, 0x18, ...asciiBytes("ftyp"), ...asciiBytes("qt  ")]);
    expect(sniffMimeType(bytes)).toEqual({ mime: "video/quicktime", kind: "video" });
  });

  it("returns null for an unsupported/garbage buffer", () => {
    expect(sniffMimeType(bytesFrom([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]))).toBeNull();
  });

  it("returns null for a buffer shorter than any signature", () => {
    expect(sniffMimeType(bytesFrom([0xff, 0xd8]))).toBeNull();
  });
});
