import "server-only";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2 } from "@/lib/storage/r2";
import { env } from "@/env";

const DEFAULT_EXPIRY_SECONDS = 300;

// Private bucket, no public URLs (PRD.md Section 9/11) — every read goes through a
// short-lived signed GET.
export function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

// For direct-to-R2 uploads from the client (Milestone 4) — the browser PUTs straight
// to this URL, so asset bytes never pass through our server.
export function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.STORAGE_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}
