import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/env";

// R2's S3-compatible API (https://developers.cloudflare.com/r2/api/s3/api/) — region
// is always "auto" for R2, regardless of the bucket's actual location.
export const r2 = new S3Client({
  region: "auto",
  endpoint: env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET,
  },
});
