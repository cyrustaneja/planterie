"use client";

import type { PendingUpload } from "@/lib/upload-queue/db";

interface FilmstripProps {
  items: PendingUpload[];
  onRetry: (id: string) => void;
}

const STATUS_LABEL: Record<PendingUpload["status"], string> = {
  queued: "Waiting…",
  uploading: "Uploading…",
  done: "Done",
  failed: "Failed",
};

export function Filmstrip({ items, onRetry }: FilmstripProps) {
  if (items.length === 0) return null;

  return (
    <ul className="flex w-full max-w-2xl flex-col gap-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded border border-line bg-surface px-3 py-2"
        >
          <div className="flex flex-col">
            <span className="font-mono text-sm text-ink">{item.filename}</span>
            <span
              className={item.status === "failed" ? "text-sm text-rose-600" : "text-sm text-sage"}
            >
              {item.status === "failed" && item.lastError
                ? item.lastError
                : STATUS_LABEL[item.status]}
            </span>
          </div>
          {item.status === "failed" ? (
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="rounded border border-pine px-3 py-1 text-sm text-pine hover:bg-pine hover:text-canvas"
            >
              Retry
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
