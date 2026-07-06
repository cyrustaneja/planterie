import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireUser: vi.fn().mockResolvedValue({ id: "user-1", email: "a@b.com", role: "member" }),
}));

const getSignedUploadUrlMock = vi.fn();
vi.mock("@/lib/storage/signed-url", () => ({
  getSignedUploadUrl: getSignedUploadUrlMock,
}));

const { createSignedUpload } = await import("@/app/upload/actions");

function base64Of(bytes: number[]): string {
  return Buffer.from(bytes).toString("base64");
}

const JPEG_HEADER = base64Of([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GARBAGE_HEADER = base64Of([0x00, 0x01, 0x02, 0x03]);

describe("createSignedUpload", () => {
  beforeEach(() => {
    getSignedUploadUrlMock.mockReset();
  });

  it("succeeds for an allowed type under the size cap", async () => {
    getSignedUploadUrlMock.mockResolvedValue("https://example.com/signed-put");

    const result = await createSignedUpload({
      headerBytesBase64: JPEG_HEADER,
      declaredSize: 1024,
    });

    expect(result).toEqual({
      ok: true,
      data: {
        key: expect.stringMatching(/^assets\//),
        url: "https://example.com/signed-put",
        mime: "image/jpeg",
        kind: "photo",
      },
    });
  });

  it("rejects a file type it can't recognize", async () => {
    const result = await createSignedUpload({
      headerBytesBase64: GARBAGE_HEADER,
      declaredSize: 1024,
    });

    expect(result.ok).toBe(false);
    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects a photo over the size cap", async () => {
    const result = await createSignedUpload({
      headerBytesBase64: JPEG_HEADER,
      declaredSize: 20 * 1024 * 1024,
    });

    expect(result).toEqual({ ok: false, error: expect.stringContaining("too large") });
    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });
});
