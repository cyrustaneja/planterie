import "server-only";
import { r2, bucketObjectUrl } from "@/lib/storage/r2";

const DEFAULT_EXPIRY_SECONDS = 300;

async function presign(key: string, method: string, expiresInSeconds: number): Promise<string> {
  const url = bucketObjectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await r2.sign(url.toString(), { method, aws: { signQuery: true } });
  return signed.url;
}

// Private bucket, no public URLs (PRD.md Section 9/11) — every read goes through a
// short-lived signed GET.
export function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  return presign(key, "GET", expiresInSeconds);
}

// For direct-to-R2 uploads from the client (Milestone 4) — the browser PUTs straight
// to this URL, so asset bytes never pass through our server. Content-Type isn't bound
// into the signature (aws4fetch's query-string presigning only signs method/host/path
// by default) — the client sets it as a plain header on the PUT, same as a standard S3
// presigned URL without an explicit Content-Type condition.
export function getSignedUploadUrl(
  key: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  return presign(key, "PUT", expiresInSeconds);
}

// Checked via a plain fetch() by the caller, not r2.send()-equivalent — see
// finalizeAsset in src/app/upload/actions.ts for why the object's existence/size is
// verified this way rather than an SDK "head object" call.
export function getSignedHeadUrl(
  key: string,
  expiresInSeconds = DEFAULT_EXPIRY_SECONDS,
): Promise<string> {
  return presign(key, "HEAD", expiresInSeconds);
}
