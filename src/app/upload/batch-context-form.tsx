"use client";

import { useState, type FormEvent } from "react";
import { ASSET_TYPES } from "@/lib/asset-types";
import { createBatch } from "@/app/upload/actions";

interface BatchContextFormProps {
  onBatchCreated: (batchId: string) => void;
}

export function BatchContextForm({ onBatchCreated }: BatchContextFormProps) {
  const [contextKind, setContextKind] = useState<"event" | "project">("event");
  const [assetType, setAssetType] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [projectName, setProjectName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createBatch({
      assetType,
      eventName: contextKind === "event" ? eventName : undefined,
      eventDate: contextKind === "event" ? eventDate : undefined,
      projectName: contextKind === "project" ? projectName : undefined,
      purpose: purpose || undefined,
    });

    setSubmitting(false);
    if (result.ok) {
      onBatchCreated(result.data.batchId);
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-sage">Asset type</span>
        <select
          required
          value={assetType}
          onChange={(event) => setAssetType(event.target.value)}
          className="rounded border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pine"
        >
          <option value="" disabled>
            Choose one
          </option>
          {ASSET_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="contextKind"
            checked={contextKind === "event"}
            onChange={() => setContextKind("event")}
          />
          Event
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="contextKind"
            checked={contextKind === "project"}
            onChange={() => setContextKind("project")}
          />
          Project
        </label>
      </div>

      {contextKind === "event" ? (
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-sage">Event name</span>
            <input
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pine"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-sage">Date</span>
            <input
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              className="rounded border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pine"
            />
          </label>
        </div>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-sage">Project name</span>
          <input
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            className="rounded border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pine"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm text-sage">Purpose (optional)</span>
        <textarea
          value={purpose}
          onChange={(event) => setPurpose(event.target.value)}
          rows={2}
          className="rounded border border-line bg-surface px-3 py-2 text-ink outline-none focus:border-pine"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || !assetType}
        className="rounded bg-pine px-4 py-2 font-medium text-canvas disabled:opacity-60"
      >
        {submitting ? "Starting…" : "Continue"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
