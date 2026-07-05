"use client";

import { useState, type FormEvent } from "react";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    const result = await sendMagicLink(email);
    if (result.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(result.error ?? "Something went wrong. Try again.");
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="font-display text-3xl text-pine-deep">Planterie Asset Studio</h1>

      {status === "sent" ? (
        <p className="max-w-sm text-sage">
          Check <span className="font-mono text-ink">{email}</span> for a sign-in link.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="email"
            required
            autoFocus
            placeholder="you@planterie.in"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded border border-line bg-surface px-4 py-2 text-ink outline-none focus:border-pine"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded bg-pine px-4 py-2 font-medium text-canvas disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : "Send sign-in link"}
          </button>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </form>
      )}
    </main>
  );
}
