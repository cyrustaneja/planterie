"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSignedUploadUrl, getSignedHeadUrl } from "@/lib/storage/signed-url";
import { sniffMimeType, type MediaKind } from "@/lib/media/sniff-mime";
import {
  ALLOWED_PHOTO_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  MAX_PHOTO_BYTES,
  MAX_VIDEO_BYTES,
} from "@/lib/media/limits";
import { isAssetType, type AssetType } from "@/lib/asset-types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface CreateBatchInput {
  assetType: string;
  eventName?: string;
  eventDate?: string;
  projectName?: string;
  purpose?: string;
}

export async function createBatch(
  input: CreateBatchInput,
): Promise<ActionResult<{ batchId: string }>> {
  const user = await requireUser();

  if (!isAssetType(input.assetType)) {
    return { ok: false, error: "Choose an asset type before continuing." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("batches")
    .insert({
      asset_type: input.assetType,
      event_name: input.eventName || null,
      event_date: input.eventDate || null,
      project_name: input.projectName || null,
      purpose: input.purpose || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createBatch: insert failed", { message: error?.message });
    return { ok: false, error: "Couldn't start this batch. Try again." };
  }

  return { ok: true, data: { batchId: data.id } };
}

export interface CreateSignedUploadInput {
  headerBytesBase64: string;
  declaredSize: number;
}

export interface CreateSignedUploadOutput {
  key: string;
  url: string;
  mime: string;
  kind: MediaKind;
}

export async function createSignedUpload(
  input: CreateSignedUploadInput,
): Promise<ActionResult<CreateSignedUploadOutput>> {
  await requireUser();

  const headerBytes = Uint8Array.from(Buffer.from(input.headerBytesBase64, "base64"));
  const sniffed = sniffMimeType(headerBytes);
  if (!sniffed) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a photo (JPEG/PNG/WEBP/HEIC) or video (MP4/MOV/WEBM).",
    };
  }

  const { mime, kind } = sniffed;
  const isAllowedPhoto = kind === "photo" && ALLOWED_PHOTO_MIME_TYPES.has(mime);
  const isAllowedVideo = kind === "video" && ALLOWED_VIDEO_MIME_TYPES.has(mime);
  if (!isAllowedPhoto && !isAllowedVideo) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a photo (JPEG/PNG/WEBP/HEIC) or video (MP4/MOV/WEBM).",
    };
  }

  const maxBytes = kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
  if (input.declaredSize > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    return {
      ok: false,
      error: `${kind === "photo" ? "Photo" : "Video"} is too large (max ${limitMb}MB).`,
    };
  }

  const key = `assets/${crypto.randomUUID()}`;
  const url = await getSignedUploadUrl(key);

  return { ok: true, data: { key, url, mime, kind } };
}

export interface FinalizeAssetInput {
  batchId: string;
  key: string;
  kind: MediaKind;
  mime: string;
  width?: number;
  height?: number;
  takenAt?: string;
}

export async function finalizeAsset(
  input: FinalizeAssetInput,
): Promise<ActionResult<{ assetId: string }>> {
  const user = await requireUser();

  // Defense against a client that requested a signed URL but then uploaded something
  // else (or nothing) — confirm the object is actually there before trusting it.
  let sizeBytes: number;
  try {
    const headUrl = await getSignedHeadUrl(input.key);
    const headRes = await fetch(headUrl, { method: "HEAD" });
    if (!headRes.ok) throw new Error(`HEAD returned ${headRes.status}`);
    sizeBytes = Number(headRes.headers.get("content-length") ?? 0);
  } catch (error) {
    console.error("finalizeAsset: confirming the upload failed", {
      key: input.key,
      message: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, error: "Couldn't confirm the upload finished. Try again." };
  }

  const maxBytes = input.kind === "photo" ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
  if (sizeBytes === 0 || sizeBytes > maxBytes) {
    console.error("finalizeAsset: uploaded object size out of bounds", {
      key: input.key,
      sizeBytes,
    });
    return { ok: false, error: "The uploaded file didn't match what was expected. Try again." };
  }

  const supabase = await createClient();
  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .select("asset_type")
    .eq("id", input.batchId)
    .single();

  if (batchError || !batch) {
    return { ok: false, error: "That batch no longer exists. Start a new one." };
  }

  const { data, error } = await supabase
    .from("assets")
    .insert({
      storage_key: input.key,
      type: input.kind,
      asset_type: batch.asset_type as AssetType,
      mime: input.mime,
      width: input.width ?? null,
      height: input.height ?? null,
      size_bytes: sizeBytes,
      taken_at: input.takenAt ?? null,
      uploaded_by: user.id,
      batch_id: input.batchId,
      status: "processing",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("finalizeAsset: insert failed", { message: error?.message });
    return { ok: false, error: "Uploaded, but couldn't save it to the library. Try again." };
  }

  return { ok: true, data: { assetId: data.id } };
}
