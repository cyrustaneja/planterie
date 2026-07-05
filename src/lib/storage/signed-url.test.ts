import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const getSignedUrlMock = vi.fn();

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

vi.mock("@/lib/storage/r2", () => ({ r2: {} }));

const { getSignedDownloadUrl, getSignedUploadUrl } = await import("@/lib/storage/signed-url");

describe("getSignedDownloadUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset();
  });

  it("requests a GET presign for the given key with the configured bucket", async () => {
    getSignedUrlMock.mockResolvedValue("https://example.com/signed-get");

    const url = await getSignedDownloadUrl("assets/photo.jpg", 60);

    expect(url).toBe("https://example.com/signed-get");
    const [, command, options] = getSignedUrlMock.mock.calls[0];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({ Bucket: "planterie-assets", Key: "assets/photo.jpg" });
    expect(options).toEqual({ expiresIn: 60 });
  });
});

describe("getSignedUploadUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset();
  });

  it("requests a PUT presign with the given key and content type", async () => {
    getSignedUrlMock.mockResolvedValue("https://example.com/signed-put");

    const url = await getSignedUploadUrl("assets/photo.jpg", "image/jpeg", 120);

    expect(url).toBe("https://example.com/signed-put");
    const [, command, options] = getSignedUrlMock.mock.calls[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: "planterie-assets",
      Key: "assets/photo.jpg",
      ContentType: "image/jpeg",
    });
    expect(options).toEqual({ expiresIn: 120 });
  });
});
