import {
  putPendingUpload,
  getAllPendingUploads,
  clearDoneUploads,
  type PendingUpload,
} from "@/lib/upload-queue/db";
import { compressImageToFit } from "@/lib/media/compress-image";
import { CANVAS_DECODABLE_MIME_TYPES, MAX_PHOTO_BYTES } from "@/lib/media/limits";
import { createSignedUpload, finalizeAsset } from "@/app/upload/actions";

const HEADER_BYTES_LENGTH = 64;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30_000;
const RETRY_MAX_ATTEMPTS = 6;

// Exponential backoff, capped — kept as its own pure function so it's unit-testable
// without touching IndexedDB or the network.
export function getRetryDelayMs(attempts: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempts, RETRY_MAX_MS);
}

export type QueueListener = (items: PendingUpload[]) => void;

const listeners = new Set<QueueListener>();
let processing = false;

async function notifyListeners(): Promise<void> {
  const items = await getAllPendingUploads();
  listeners.forEach((listener) => listener(items));
}

export function subscribeToQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  void notifyListeners();
  return () => listeners.delete(listener);
}

export async function enqueue(file: File, batchId: string): Promise<void> {
  const item: PendingUpload = {
    id: crypto.randomUUID(),
    batchId,
    blob: file,
    filename: file.name,
    declaredMime: file.type,
    status: "queued",
    attempts: 0,
    createdAt: Date.now(),
  };
  await putPendingUpload(item);
  await notifyListeners();
  void processQueue();
}

async function toBase64(bytes: Uint8Array): Promise<string> {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function readHeaderBase64(blob: Blob): Promise<string> {
  const header = await blob.slice(0, HEADER_BYTES_LENGTH).arrayBuffer();
  return toBase64(new Uint8Array(header));
}

async function readImageDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
  if (!CANVAS_DECODABLE_MIME_TYPES.has(blob.type)) return {};
  try {
    const bitmap = await createImageBitmap(blob);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return {};
  }
}

async function processItem(item: PendingUpload): Promise<void> {
  item.status = "uploading";
  await putPendingUpload(item);
  await notifyListeners();

  // Every canvas-decodable photo is downsized before the first upload attempt — see
  // compress-image.ts. HEIC/video pass through untouched.
  let blob: Blob = item.blob;
  if (CANVAS_DECODABLE_MIME_TYPES.has(item.declaredMime)) {
    const asFile =
      item.blob instanceof File
        ? item.blob
        : new File([item.blob], item.filename, { type: item.declaredMime });
    blob = await compressImageToFit(asFile, MAX_PHOTO_BYTES);
  }

  const headerBase64 = await readHeaderBase64(blob);
  const signed = await createSignedUpload({
    headerBytesBase64: headerBase64,
    declaredSize: blob.size,
  });

  if (!signed.ok) {
    item.status = "failed";
    item.lastError = signed.error;
    await putPendingUpload(item);
    await notifyListeners();
    return;
  }

  try {
    const putRes = await fetch(signed.data.url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": signed.data.mime },
    });
    if (!putRes.ok) throw new Error(`Upload failed with status ${putRes.status}`);
  } catch (error) {
    await scheduleRetry(item, error instanceof Error ? error.message : "Upload failed. Retrying…");
    return;
  }

  const dimensions = await readImageDimensions(blob);
  const finalized = await finalizeAsset({
    batchId: item.batchId,
    key: signed.data.key,
    kind: signed.data.kind,
    mime: signed.data.mime,
    ...dimensions,
  });

  if (!finalized.ok) {
    await scheduleRetry(item, finalized.error);
    return;
  }

  item.status = "done";
  await putPendingUpload(item);
  await notifyListeners();
}

// Called when the user starts a new batch — clears completed items from the
// previous one so the filmstrip doesn't grow unbounded across sessions.
export async function clearCompleted(): Promise<void> {
  await clearDoneUploads();
  await notifyListeners();
}

async function scheduleRetry(item: PendingUpload, error: string): Promise<void> {
  item.attempts += 1;
  item.lastError = error;

  if (item.attempts >= RETRY_MAX_ATTEMPTS) {
    item.status = "failed";
    await putPendingUpload(item);
    await notifyListeners();
    return;
  }

  item.status = "queued";
  await putPendingUpload(item);
  await notifyListeners();

  const delay = getRetryDelayMs(item.attempts);
  setTimeout(() => void processQueue(), delay);
}

// Idempotent — safe to call repeatedly (e.g. on page load and on an `online` event).
export async function processQueue(): Promise<void> {
  if (processing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  processing = true;
  try {
    const items = await getAllPendingUploads();
    for (const item of items) {
      if (item.status !== "queued") continue;
      // A crash anywhere in processItem (a network drop, an unexpected server
      // exception, anything) must never leave an item stuck in "uploading" with no
      // way to recover — route every failure through scheduleRetry/failed instead.
      try {
        await processItem(item);
      } catch (error) {
        await scheduleRetry(
          item,
          error instanceof Error ? error.message : "Something went wrong. Retrying…",
        );
      }
    }
  } finally {
    processing = false;
  }
}

export function retryItem(id: string): Promise<void> {
  return getAllPendingUploads().then(async (items) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    item.status = "queued";
    item.attempts = 0;
    await putPendingUpload(item);
    await notifyListeners();
    void processQueue();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void processQueue());
}
