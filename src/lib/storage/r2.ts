import "server-only";
import { AwsClient } from "aws4fetch";
import { env } from "@/env";

// R2's S3-compatible API (https://developers.cloudflare.com/r2/api/s3/api/) — region
// is always "auto" for R2, regardless of the bucket's actual location.
//
// Uses aws4fetch (SigV4 signing over the standard fetch/Web Crypto APIs) rather than
// @aws-sdk/client-s3. The full AWS SDK's config resolution unconditionally attempts to
// read a shared AWS config file via fs.readFile as one step in its provider chain, even
// when credentials/region are passed as static values — Cloudflare Workers' Node-compat
// shim doesn't implement that, crashing every request. aws4fetch has no Node.js API
// dependencies at all, which is why Cloudflare's own R2 examples use it from Workers.
export const r2 = new AwsClient({
  accessKeyId: env.STORAGE_ACCESS_KEY,
  secretAccessKey: env.STORAGE_SECRET,
  service: "s3",
  region: "auto",
});

// Virtual-hosted-style URL (bucket as a subdomain of the endpoint) — matches how R2's
// S3-compatible API expects requests to be addressed.
export function bucketObjectUrl(key: string): URL {
  const endpoint = new URL(env.STORAGE_ENDPOINT);
  return new URL(`/${key}`, `${endpoint.protocol}//${env.STORAGE_BUCKET}.${endpoint.host}`);
}
