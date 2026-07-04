# CLAUDE.md — Planterie Asset Studio

Rules and conventions for building this project with Claude Code. **Read this at the start of every session.** The full product spec is in `PRD.md`; this file is the rulebook. Also see `AGENTS.md` for framework-specific (Next.js version) notes.

---

## What we're building (one line)

An internal, **mobile-first web app (PWA)** for Planterie to **capture or drop** photos & videos, **auto-tag** them against Planterie's plant/pot catalog, and **search & share** them. v1 scope only — Shopify and Meta are later phases. Full detail in `PRD.md`.

---

## Tech constraints (don't deviate without asking)

- **Next.js (App Router) + TypeScript in strict mode.** All privileged logic in server routes/actions.
- **Hosting:** Cloudflare Pages (decided — Vercel Hobby is non-commercial and not allowed for this tool).
- **Database:** Postgres via Supabase (decided — also provides Auth).
- **File storage:** Cloudflare R2 (decided). Buckets **private**; serve via short-lived **signed URLs** only. Never store image bytes in the DB.
- **Auth required on everything.** Supabase Auth. Roles: **Admin** and **Member**.
- **Runtime tagging:** Google **Gemini Flash / Flash-Lite (free tier)**; provider + model in env vars (`TAGGING_PROVIDER`, `TAGGING_MODEL`), swappable without code changes.
- **PWA only — no native app.** Camera via the browser; "add to home screen" for app-like use.
- **Tags are flexible data** (a tags table, not fixed columns) so new tags never require a schema change.

---

## Working style

- **Plan before you code.** For each milestone, write a short plan (files, approach, risks) and get it approved before implementing. Use plan mode for anything non-trivial.
- **Small steps, one thing at a time.** Finish and verify one feature before starting the next. Don't refactor unrelated code in the same change.
- **Keep `PROGRESS.md` current** — what's done, what's next, known issues, decisions.
- **Match existing patterns.** Don't introduce a second way of doing the same thing.
- **Ask when the spec is ambiguous** instead of guessing. A wrong assumption costs more than a question.
- **Build in the order in `PRD.md` Section 14.** Do not start Shopify/Meta until v1 is fully tested and deployed.

---

## Code quality

- **Strict TypeScript. No `any`.** Explicit types at boundaries (API in/out, DB rows).
- **Lint + format clean** before every commit (ESLint/Biome + Prettier). Zero lint errors committed.
- **Small, focused functions and files.** Clear names. Comment the _why_, not the _what_.
- **No dead code, commented-out blocks, or leftover `console.log`.**
- **Handle every error path.** Never swallow errors. User-facing messages are clear and actionable ("what went wrong + how to fix"), never a generic "something went wrong". Log server errors with context.
- **Don't invent APIs.** Check official docs for any library / Gemini / Shopify call before using it. **Pin dependency versions.**

---

## Security — non-negotiable

- **Secrets stay server-side.** API keys, DB creds, storage keys live in env vars, used only in server code. **Never ship a secret to the browser. Never commit one.**
- **Private storage + signed URLs.** No public buckets, ever.
- **Auth-check every route server-side.** Don't trust the client. Enforce Admin vs Member.
- **Share links** = long unguessable tokens, with **expiry and revocation**, scoped to only the shared assets.
- **Validate & sanitize all input.** Enforce file mime-type and size limits on the server. **Parametrized / ORM queries only** (no string-built SQL).
- **Rate-limit** upload, tagging, and share endpoints. Guard against SSRF (no fetching arbitrary user-supplied URLs server-side).
- **HTTPS only; secure, http-only session cookies.**
- **Private by default.** Require a **human approval step before any asset is published** to social/Shopify (v2). Build no auto-publish path without that gate.
- **Audit log** for deletes, shares, role changes, publishes.
- Run `npm audit` (or equivalent); fix criticals. Keep dependencies minimal.

---

## Testing & bug-fixing discipline

- **Critical logic is test-first:** the tagging JSON parse/validation, confidence→review routing, the data layer, share-link expiry/revocation, and permission checks.
- **Reproduce → write a failing test → fix → verify.** Never fix a bug without a test that would have caught it.
- **Run the tests AND the app before claiming a task is done.** "It should work" ≠ "it works." Actually exercise the flow.
- **Test the edge cases explicitly:** HEIC and no-extension files; very large files; offline / interrupted upload; empty library; zero search results; an off-catalog plant; a video; a large batch; a revoked/expired share link; an unauthorized user hitting a protected route.
- **Verify against the real sample photos**, not just synthetic ones — that's where tag quality is proven.
- **End-to-end (Playwright)** for the core journeys: sign in → capture/drop a batch → tagged → clear a review item → search/filter → share and open the link → unauthorized access blocked.

**Definition of Done per feature:** implemented + fully typed + lint-clean + tested (unit + relevant flow) + error/empty states handled + works on mobile + secure + `PROGRESS.md` updated.

---

## Human approval gates

Stop and ask before anything destructive or irreversible: deleting assets, changing roles, running migrations that drop/alter data, or (v2) publishing to Shopify.

---

## Free AI layer — rules

- Tagging uses **Gemini free tier** (Flash / Flash-Lite): ~**15 RPM, 1M TPM, 1,500 requests/day** — plenty for ~300 photos/week.
- **Implement a request queue** with rate limiting and **exponential backoff on 429s**. Never fire parallel bursts.
- **No SLA on the free tier** → add retries and a graceful fallback so a busy upload never loses a photo.
- **Data privacy:** free-tier inputs may be used by Google to improve models and seen by human reviewers. Fine for plant/stock photos. For photos with **people (events/workshops, incl. children)**, confirm this is acceptable or route them through a private path (paid Gemini Flash — cents, no training — or another provider). **Never send truly sensitive data through the free tier.**
- Keep `TAGGING_PROVIDER` / `TAGGING_MODEL` in env so free → paid → different provider is a config change, not a code change.
- Use Gemini's **JSON/structured-output mode** to enforce the tag schema (see `PRD.md` Section 8.3).
