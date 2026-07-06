import { describe, expect, it, vi, beforeEach } from "vitest";

const signMock = vi.fn();

vi.mock("@/lib/storage/r2", () => ({
  r2: { sign: signMock },
  bucketObjectUrl: (key: string) =>
    new URL(`https://planterie-assets.example.r2.cloudflarestorage.com/${key}`),
}));

const { getSignedDownloadUrl, getSignedUploadUrl, getSignedHeadUrl } =
  await import("@/lib/storage/signed-url");

describe("getSignedDownloadUrl", () => {
  beforeEach(() => {
    signMock.mockReset();
  });

  it("signs a GET request for the given key with the requested expiry", async () => {
    signMock.mockResolvedValue({ url: "https://example.com/signed-get" });

    const url = await getSignedDownloadUrl("assets/photo.jpg", 60);

    expect(url).toBe("https://example.com/signed-get");
    const [signedUrl, options] = signMock.mock.calls[0];
    expect(signedUrl).toBe(
      "https://planterie-assets.example.r2.cloudflarestorage.com/assets/photo.jpg?X-Amz-Expires=60",
    );
    expect(options).toEqual({ method: "GET", aws: { signQuery: true } });
  });
});

describe("getSignedUploadUrl", () => {
  beforeEach(() => {
    signMock.mockReset();
  });

  it("signs a PUT request for the given key", async () => {
    signMock.mockResolvedValue({ url: "https://example.com/signed-put" });

    const url = await getSignedUploadUrl("assets/photo.jpg", 120);

    expect(url).toBe("https://example.com/signed-put");
    const [signedUrl, options] = signMock.mock.calls[0];
    expect(signedUrl).toContain("X-Amz-Expires=120");
    expect(options).toEqual({ method: "PUT", aws: { signQuery: true } });
  });
});

describe("getSignedHeadUrl", () => {
  beforeEach(() => {
    signMock.mockReset();
  });

  it("signs a HEAD request for the given key", async () => {
    signMock.mockResolvedValue({ url: "https://example.com/signed-head" });

    const url = await getSignedHeadUrl("assets/photo.jpg", 60);

    expect(url).toBe("https://example.com/signed-head");
    const [, options] = signMock.mock.calls[0];
    expect(options).toEqual({ method: "HEAD", aws: { signQuery: true } });
  });
});
