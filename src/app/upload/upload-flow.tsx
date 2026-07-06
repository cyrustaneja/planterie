"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { BatchContextForm } from "@/app/upload/batch-context-form";
import { Filmstrip } from "@/app/upload/filmstrip";
import {
  enqueue,
  processQueue,
  retryItem,
  clearCompleted,
  subscribeToQueue,
} from "@/lib/upload-queue/queue";
import type { PendingUpload } from "@/lib/upload-queue/db";

export function UploadFlow() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [items, setItems] = useState<PendingUpload[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);

  // Runs regardless of batchId/UI state — items from an interrupted previous session
  // (e.g. the tab closed mid-upload) must keep resuming even before a new batch starts,
  // and the filmstrip below stays visible so the user can actually see that happening.
  useEffect(() => {
    void processQueue();
    return subscribeToQueue(setItems);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !batchId) return;
      Array.from(files).forEach((file) => void enqueue(file, batchId));
    },
    [batchId],
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleStartNewBatch() {
    void clearCompleted();
    setBatchId(null);
  }

  const hasPending = items.some((item) => item.status === "queued" || item.status === "uploading");
  const hasFailed = items.some((item) => item.status === "failed");
  const allDone = items.length > 0 && items.every((item) => item.status === "done");

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      {items.length > 0 ? (
        <div className="flex w-full flex-col items-center gap-2">
          <Filmstrip items={items} onRetry={(id) => void retryItem(id)} />
          {hasFailed ? (
            <p className="text-sm text-rose-600">
              Some items failed. Fix the connection or the file, then tap Retry.
            </p>
          ) : null}
        </div>
      ) : null}

      {!batchId ? (
        <BatchContextForm onBatchCreated={setBatchId} />
      ) : (
        <>
          <div className="flex gap-3">
            <input
              ref={captureInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => captureInputRef.current?.click()}
              className="rounded bg-pine px-4 py-2 font-medium text-canvas"
            >
              Capture
            </button>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            className={`flex w-full flex-col items-center gap-2 rounded border-2 border-dashed px-6 py-10 text-center ${
              isDraggingOver ? "border-pine bg-pine/5" : "border-line"
            }`}
          >
            <p className="text-sage">Drop photos or videos here</p>
            <label className="cursor-pointer text-pine underline">
              or choose files
              {/* No `accept` restriction here, deliberately: some OS file pickers use it
                  to filter out files they can't classify by extension — including a
                  correctly-encoded HEIC with no extension at all (the exact case
                  PRD.md/CLAUDE.md call out). We validate every file ourselves via
                  magic-byte sniffing server-side regardless, so nothing is gained by
                  also restricting what the OS lets the user pick, and doing so risks
                  silently hiding a real photo — the one thing this milestone must never
                  do. Drag-and-drop already bypasses this same OS filtering, which is why
                  it never needed this fix. */}
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleFiles(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {items.length === 0 ? <p className="text-sm text-sage">Nothing added yet.</p> : null}
        </>
      )}

      {allDone && !hasPending ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-pine">{items.length} uploaded.</p>
          <button
            type="button"
            onClick={handleStartNewBatch}
            className="rounded border border-pine px-4 py-2 text-sm text-pine"
          >
            Start a new batch
          </button>
        </div>
      ) : null}
    </div>
  );
}
