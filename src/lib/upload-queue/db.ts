import { openDB, type IDBPDatabase } from "idb";

export type UploadStatus = "queued" | "uploading" | "done" | "failed";

export interface PendingUpload {
  id: string;
  batchId: string;
  blob: Blob;
  filename: string;
  declaredMime: string;
  status: UploadStatus;
  attempts: number;
  lastError?: string;
  createdAt: number;
}

const DB_NAME = "planterie-upload-queue";
const STORE_NAME = "pending_uploads";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: "id" });
    },
  });
  return dbPromise;
}

export async function putPendingUpload(item: PendingUpload): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, item);
}

export async function getAllPendingUploads(): Promise<PendingUpload[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function deletePendingUpload(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

// Completed items stay in IndexedDB (status: "done") so the UI can show a real
// success state, rather than items just vanishing the instant they finish.
export async function clearDoneUploads(): Promise<void> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  await Promise.all(
    all.filter((item) => item.status === "done").map((item) => db.delete(STORE_NAME, item.id)),
  );
}
