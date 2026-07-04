# Planterie Asset Studio — Build Document

**A single internal app to capture, auto-tag, search, and share Planterie's photos and videos — and later feed them into Shopify and Meta.**
This document is the complete spec for building the tool with Claude Code. Read it fully before writing any code.
---

## 0. How to use this document with Claude Code

1. Put this file in the repo root as `PRD.md`.
2. Copy **Section 12 (Engineering Rules)** into a separate `CLAUDE.md` at the repo root — Claude Code reads that automatically on every session.
3. Start each work session by pointing Claude Code at `PRD.md` and asking it to **plan the current milestone before coding** (see Section 14 for milestone order).
4. Build strictly in phases. Do not start Shopify/Meta work until v1 is fully tested and deployed.
5. Keep a running `PROGRESS.md` that Claude Code updates after each milestone (what's done, what's next, known issues).
   Official setup reference (verify current requirements here, they change): https://docs.claude.com/en/docs/claude-code/overview — install with `npm install -g @anthropic-ai/claude-code`, run `claude` in the project folder. Requires a recent Node LTS.

---

## 1. Business objective & context

**Who:** Planterie (planterie.in) — a plant studio and cafe in Delhi NCR. Sells curated plants, terrariums, bonsai, arrangements; runs workshops, corporate gifting, and plantscaping projects.
**The problem today.** Photos and videos are shot on multiple phones (staff, different devices, different formats), then scattered. To make them useful, someone currently renames each file by hand with the plant, pot, project, and purpose baked into the filename — inconsistently, in a flat pile, with no way to search or share as a set. As volume grows this collapses.
**The objective.** One internal app that:

- lets the team **capture photos in-app** (phone camera) or **drop in** existing photos/videos,
- **auto-tags** each asset against Planterie's real catalog (plant, pot, and more),
- makes everything **searchable** by any tag and **shareable** in a couple of taps,
- and later **links to Shopify** (attach images to products) and **feeds Meta** campaigns and AI photoshoots.
  **Why this framing wins.** The hardest part of the old plan — herding photos off many devices into one place — only exists because capture happens in the phone's default camera. Capturing inside the app removes that problem entirely: the app _is_ the single library. Format and context are handled at the moment of capture.
  **Non-goals for v1** (explicitly out of scope until later): Shopify publishing, Meta/ad integration, AI photoshoot generation, public-facing galleries, video editing, multi-org/multi-tenant support.

---

## 2. Success metrics & guardrails

**v1 is successful if:**

- A staff member can capture or drop an event's ~100 assets and have them tagged and searchable within minutes, with **no manual file renaming**.
- Searching by a plant, pot, event, or attribute returns the right assets reliably.
- Sharing a set to a client/colleague takes under 30 seconds.
- Tagging is accurate enough that the review queue stays small (target: the team trusts the tags without re-checking every one).
  **Guardrails (the two things that make or break this):**

1. **Ingestion reliability** — no photo should ever be silently lost (offline capture, flaky venue wifi, HEIC files). Solved by owning capture + an upload queue with retries.
2. **Tag quality** — the whole value depends on it. Solved by a controlled catalog vocabulary + a human review pass for anything low-confidence or off-catalog.

---

## 3. Users & personas

- **Khushi (Operations) — primary, daily user.** Uploads/captures, tags, searches, shares, clears the review queue. Not a developer. The UI must be obvious and fast on mobile.
- **Himank (Founder) — occasional, decision-maker.** Browses, pulls assets for proposals/social, reviews. Wants to see it working end to end.
- **Field staff at events — light users.** Open the app on a phone, snap photos into the right event, done.
  Access is a small, trusted internal team. Everyone signs in; roles are **Admin** (manage catalog, users, delete) and **Member** (capture, tag, search, share).

---

## 4. Asset types & the tag model

### 4.1 The seven asset types (from Planterie)

Every asset belongs to one type. This is a single controlled field:

1. **Website / Product** — clean product shots (plants and terrariums) for the store.
2. **Stock — Plants** and **Stock — Pots/Jars** — bare inventory shots for backend stock (kept separately).
3. **Customer Sends** — quick operational plant pics sent to customers (not styled, but useful).
4. **Social** — Instagram stories, Pinterest, other media (can also be sent to customers).
5. **Raw Clips** — unedited video for L&D or future reels/YouTube.
6. **Plantscaping Projects** — before/after for proposals.
7. **Event Coverage** — event photos/videos (usable on website or social).

### 4.2 The three tag sources — the core design idea

Every tag Planterie wants falls into exactly one of three buckets. This drives the whole app:

| Source                                                                                                                                                                                                                                                             | Tags                                                                                                                                  | How it's set                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Read from the photo (AI)**                                                                                                                                                                                                                                       | plant + name, pot/jar + name, people (yes/no + count), food/drink, with-setting / without-setting, bulk, indoor/outdoor, colour/theme | Vision model on upload                                   |
| **Set once per batch (context)**                                                                                                                                                                                                                                   | asset type, event (name + date), project (name), purpose                                                                              | One prompt at capture/upload, stamped on the whole batch |
| **Typed by hand**                                                                                                                                                                                                                                                  | anything unusual or corrective                                                                                                        | Inline edit in the library                               |
| Plant and pot **names** come from a **controlled catalog list** (see Appendix A) — the model picks from the list rather than guessing a species cold. This is what makes naming reliable. Anything it can't match confidently is flagged for review, not invented. |
| **Tags are stored as flexible data (a tags table, not fixed columns)** so any new tag later — season, room, campaign, colour — is just a new value, never a schema change or rebuild.                                                                              |

---

## 5. Scope by phase

**v1 — Capture → Tag → Review → Search → Share (build this fully first).**
Auth; in-app camera capture; drag/drop + file upload (photos and video); HEIC→JPEG + resize; batch context prompt; auto-tagging via vision model against the catalog; review queue for low-confidence/off-catalog; library with gallery + tag search/filter; asset detail with editable tags; share via link (with expiry) + download + WhatsApp/email; catalog vocabulary management (Admin); upload queue with retry.
**v2 — Shopify linking.** Map assets to Shopify products/collections; attach images via the Shopify Admin API; **human approval gate** before anything publishes to the live store; sync status per asset.
**v3 — Activation.** Meta/ad creative feed; AI product-photoshoot generation from tagged assets; semantic search (vector embeddings).
Ship v1, prove it on real photos, then move on. Do not pre-build v2/v3 plumbing.
---

## 6. Feature specs & user flows (v1)

For every screen, build the four states: **empty, loading, success, error.** Empty states tell the user what to do next; errors say what went wrong and how to fix it (never a generic "something went wrong").

### 6.1 Auth

- Email sign-in for the internal team (magic link or email+password). No public sign-up; Admin invites users.
- All routes except the login page require an authenticated session. Server-side session checks on every API route.

### 6.2 Capture (mobile-first)

- Big "Capture" action opens the phone camera in the browser.
- Before or right after shooting, a **batch context sheet**: asset type (required), event (name + date) or project (name), purpose (optional). This applies to every photo in the session.
- Multi-shot: keep shooting; a filmstrip shows what's queued.
- On save: each photo is queued → converted/resized → uploaded → tagged. Progress is visible per item. If offline, items sit in the queue and upload when back online (never lost).

### 6.3 Upload / drop

- Drag-and-drop zone + file picker; accepts multiple photos and videos.
- Same batch context sheet as capture.
- Handles large camera files and phone HEIC. Unsupported types show a clear message.

### 6.4 Tagging pipeline (see Section 8 for detail)

- Client converts HEIC→JPEG and downsizes (max ~1600px long edge) before upload — smaller payload, faster, cheaper.
- Server route sends the image + the controlled vocabulary + the batch context to the vision model, gets structured JSON tags, writes the asset row.
- Video: extract a representative frame (or a few) server-side and tag those; store the frame as the video's thumbnail.
- Tagging runs **asynchronously via a job queue** (not inline in the request) with **automatic retries** and a dead-letter state after N failures. This is required for reliability at batch volume and to respect serverless function time limits.

### 6.5 Review queue

- Any asset with a low-confidence tag or an **off-catalog** plant/pot lands here.
- Reviewer sees the photo + proposed tags; confirms, edits (dropdowns backed by the catalog), or adds. One tap to accept.
- Confirmed off-catalog names can be promoted into the catalog (Admin) so they stop flagging.

### 6.6 Library — browse & search

- Responsive gallery grid; fast.
- **Filter/search by any tag**: plant, pot, type, event, project, people, setting, colour, date range, free text.
- Combine filters (e.g., "Event: Diwali Popup" + "plant: Snake Plant" + "with setting").
- Asset detail: full image/video, all tags (editable), source metadata, share and download actions.

### 6.7 Share

- Select one or many assets → share.
- **Share link** (view/download a set) with **expiry and revoke**. Links are unguessable; content is private by default.
- Direct **download** (single or zip).
- **WhatsApp / email** via share link (deep link / mailto), plus native share sheet on mobile.

### 6.8 Catalog / vocabulary management (Admin)

- Editable lists of plants and pots/jars (Appendix A is the seed). Add/rename/retire.
- Editable asset types and tag options.
- This is the "living list" that keeps tagging accurate as the catalog grows (flowering/seasonal stock, new pots).

### 6.9 Settings / Admin

- Manage users and roles. View the audit log. Configure the runtime tagging model (env-driven, swappable).

---

## 7. Data model

Use Postgres. Suggested tables (adjust names as needed, keep the shape):

- **users** — id, email, name, role (admin | member), created_at.
- **assets** — id, storage_key, type (photo | video), asset_type (the 7 categories), mime, width, height, size_bytes, thumbnail_key, caption, taken_at, uploaded_by, batch_id, status (processing | tagged | needs_review | failed), created_at.
- **batches** — id, asset_type, event_name, event_date, project_name, purpose, created_by, created_at. (Carries the per-batch context.)
- **tags** — id, key (e.g. plant, pot, people, setting, colour, theme), value, in_catalog (bool), confidence (high | medium | low), source (ai | batch | manual).
- **asset_tags** — asset_id, tag_id. (Many-to-many. Alternatively store tags as JSONB on the asset **plus** a normalized table for search; if in doubt, normalize.)
- **catalog_plants** — id, name, aliases[], active.
- **catalog_pots** — id, name, aliases[], active.
- **share_links** — id, token (unguessable), asset_ids[], created_by, expires_at, revoked (bool), created_at.
- **audit_log** — id, actor, action, target, metadata, created_at. (Every delete, share, publish, role change.)
- **jobs** — id, asset_id, kind (tag | thumbnail), status, attempts, last_error, created_at. (Backing the queue if you roll your own.)
  Rules: foreign keys enforced; timestamps on everything; soft-delete (a `deleted_at`) rather than hard delete for assets; never store the raw image bytes in the DB — files live in object storage, the DB holds keys and metadata.

---

## 8. Tagging pipeline spec (the reliability core)

### 8.1 Controlled vocabulary

Seed the plant and pot lists from Appendix A (pulled from the live Planterie catalog). The model **must pick from these lists**; if it can't match confidently, it returns `in_catalog: false` with a generic guess, which routes the asset to review.

### 8.2 Prompt

Server-side, per image. Template in Appendix B. It: states the brand context; supplies the current plant list, pot list, and asset-type list; injects the batch context; and demands **strict JSON only** in a fixed schema.

### 8.3 Output schema (the model returns exactly this)

```json
{
  "plants": [{ "name": "", "in_catalog": true, "confidence": "high|medium|low" }],
  "container": { "name": "", "in_catalog": true, "confidence": "high|medium|low" },
  "people": { "present": false, "count": "none|one|few|many" },
  "food_or_drink": false,
  "styling": "styled|plain",
  "environment": "indoor|outdoor|studio|unclear",
  "bulk": false,
  "colours": ["max 3"],
  "theme_tags": ["max 5 short lowercase tags"],
  "category_guess": "",
  "caption": "max 12 words"
}
```

### 8.4 Confidence & review routing

- `high` → accept automatically.
- `medium` / `low`, or any `in_catalog: false` on plant or container → **route to review queue**.
- Never auto-publish or auto-share on the strength of AI tags alone.

### 8.5 File handling

- HEIC/HEIF → JPEG conversion (client-side where possible; server fallback). iPhones default to HEIC, and one of Planterie's sample files was a HEIC with no extension — handle this from day one.
- Downsize to ~1600px long edge before sending to the model (cost, speed) while keeping a full-res original in storage.
- Validate mime and size server-side; reject oversized or non-media files with a clear error.

### 8.6 Reliability

- Async job queue with retries + backoff; dead-letter + `failed` status surfaced in the UI so nothing disappears silently.
- Idempotent: re-running a job doesn't duplicate assets or tags.

---

## 9. Tech stack & architecture

**Recommended stack (cheap, low-maintenance, fast to build with Claude Code):**

- **Framework:** Next.js (App Router) + TypeScript. Server routes/actions for all privileged work.
- **Hosting:** Vercel. Note: Vercel's free Hobby tier is **non-commercial only**, so a business tool needs **Pro at $20/user/month**. Cloudflare Pages or Netlify have more permissive free tiers if you want to avoid that — pick one at kickoff. (Verified: Vercel Hobby is restricted to non-commercial use; commercial use requires Pro.)
- **Database:** Postgres via Supabase or Neon (free tier to start).
- **File storage:** cheap object storage — Cloudflare R2 or Backblaze B2 (low cost, no big egress fees). Files private; served via **signed/expiring URLs** only. Storage is the real cost driver for a photo tool, so keep files out of the DB and out of pricey blob tiers.
- **Auth:** Supabase Auth, Clerk, or Auth.js — whichever the team can maintain.
- **Background jobs / queue:** a jobs table + scheduled function, or a managed queue (Inngest / Trigger.dev). Needed because tagging is async and serverless functions have short time limits.
- **Vision tagging (free):** Google Gemini Flash / Flash-Lite **free tier**, server-side, with provider + model set via env vars so it's swappable (see Section 15). Requires a request queue with rate-limit handling.
- **PWA:** web app manifest + "add to home screen" so it behaves like an app on phones; camera via the browser. **No native app** — it's a large jump in build/maintenance cost for no real gain at this scale.
  **Flow:**

```
Capture / Drop  ──►  Client: HEIC→JPEG, resize
      │                        │
      ▼                        ▼
Batch context ──────►  Upload (queued, retry) ──► Object storage (private)
                                 │
                                 ▼
                        Job queue: tag + thumbnail
                                 │
                     Vision model + catalog + context
                                 │
                                 ▼
                     Postgres: asset + tags + status
                        │                     │
                        ▼                     ▼
              high-confidence → Library   low/off-catalog → Review queue
                        │
                        ▼
               Search / Browse / Share (signed URLs)
```

**Estimated running cost:** roughly **$0–20/month** — hosting + free-tier DB + cheap object storage. **The AI tagging layer is free** on Gemini's free tier at this volume. Same ballpark as an Airtable+automation combo, but a purpose-built tool you own with no per-record fees or lock-in.
---

## 10. Brand & UI theme (Planterie)

Adapt Planterie's identity into a calm, botanical, premium-but-friendly internal tool. Mobile-first (capture happens on phones). Spend visual boldness in one place; keep everything else quiet.
**Logo:** the "Planterie" wordmark is a green handwritten-style script with a small gold butterfly accent. Use the wordmark in the top bar; the butterfly can be a subtle motif (e.g., empty-state icon), used sparingly.
**Palette (design tokens):**

- `--pine` #2E6B5B — primary brand green (top bar, primary actions)
- `--pine-deep` #1C4A3E — deep green (text on light, hover)
- `--gold` #E0A63C — butterfly-gold accent (highlights, confident-match, sparingly)
- `--canvas` #FBFAF6 — warm off-white background
- `--surface` #FFFFFF — cards
- `--ink` #1A1A17 — near-black text
- `--sage` #6B7A72 — muted secondary text
- `--slate` #5F6E72 — cool neutral (echoes their photo backdrops)
- `--line` #E6E2D8 — borders
- Tag semantics: catalog-match uses a soft green; off-catalog / needs-review uses a warm amber/rose so it reads as "look at me."
  **Type:**
- Display / wordmark: an elegant high-contrast serif (e.g. **Fraunces** or **Cormorant Garamond**) — matches the site's "Collections" heading. Use with restraint.
- UI / body: a clean humanist sans (e.g. **Inter**).
- Tag/field values: a monospace, so the structured tags read like data. (This is the signature device — a photo becoming a clean, structured record.)
  **Principles:** minimal, precise spacing and type; visible keyboard focus; respects reduced-motion; responsive down to a phone; gallery and capture feel fast. Copy is plain, active voice, sentence case, in the tool's own voice ("Add photos", "Tag review", "Share set"). Don't decorate with numbered markers or dividers unless they encode real sequence.

---

## 11. Security & privacy (turn all of this on)

This tool holds Planterie's entire asset library and runs on their accounts — treat it as production from day one.

- **Auth on everything.** No unauthenticated access to any asset, API route, or share admin. Verify the session server-side on every request; never trust the client.
- **Roles (RBAC).** Admin vs Member. Only Admin can delete, manage users, manage catalog, or (in v2) publish to Shopify.
- **Secrets stay server-side.** The Anthropic API key, DB creds, storage keys, and Shopify tokens live in environment variables and are used only in server code. **Never ship a key to the browser.** No secrets in the repo or in client bundles.
- **Private storage + signed URLs.** Object storage buckets are private. Serve assets through short-lived signed URLs. No public bucket, ever.
- **Share links** are long, unguessable tokens with **expiry and revocation**; they grant access only to the specific assets shared, and only while valid.
- **Input validation everywhere.** Validate and sanitize all inputs; enforce file mime-type and size limits on the server; parametrized/ORM queries only (no string-built SQL).
- **Upload safety.** Restrict to expected media types; strip/normalize metadata as needed; guard against SSRF (don't fetch arbitrary URLs server-side based on user input).
- **Rate limiting** on upload, tagging, and share endpoints to prevent abuse and runaway cost.
- **HTTPS only**; secure, http-only session cookies.
- **People & consent.** Photos will contain people, sometimes children (workshops/events). Keep everything **private by default**; require a **human approval step before any asset is published** to social or Shopify (v2). Don't build any auto-publish path without that gate.
- **Audit log** for deletes, shares, role changes, and publishes.
- **Dependency hygiene.** Pin versions; run `npm audit` (or equivalent) and address criticals; keep dependencies minimal.
- **Backups.** Object storage and DB should have basic backup/retention configured.

---

## 12. Engineering rules for Claude Code (copy into `CLAUDE.md`)

**Working style**

- **Plan before you code.** For each milestone, write a short plan (files, approach, risks) and get it approved before implementing. Use plan mode for anything non-trivial.
- **Small steps, one thing at a time.** Implement and verify one feature before starting the next. Don't refactor unrelated code in the same change.
- **Keep `PROGRESS.md` current** — what's done, what's next, known issues, decisions made.
- **Match the existing patterns** in the codebase; don't introduce a second way of doing the same thing.
- **Ask when the spec is ambiguous** instead of guessing; a wrong assumption is more expensive than a question.
  **Code quality**
- **TypeScript strict mode. No `any`.** Prefer explicit types at boundaries (API inputs/outputs, DB rows).
- **Lint + format** on save and before commit (ESLint/Biome + Prettier). Zero lint errors in committed code.
- **Small, focused functions and files.** Clear names. Comment the _why_, not the _what_.
- **No dead code, no commented-out blocks, no console logs** left in.
- **Handle every error path.** Never swallow errors silently. Surface user-facing errors as clear, actionable messages. Log server errors with context.
- **Don't invent APIs.** If unsure about a library or an Anthropic/Shopify API, check the official docs before using it. Pin dependency versions.
  **Security (non-negotiable, see Section 11)**
- No secrets client-side or in the repo. Validate all inputs. Parametrized queries only. Private buckets + signed URLs. Auth-check every route. Human gate before any publish.
  **Testing & bug-fixing discipline**
- **Critical logic is test-first.** Write tests for the tagging parser, confidence/review routing, the data layer, and share-link expiry/revocation before or alongside the code.
- **Reproduce → failing test → fix → verify.** Never fix a bug without a test that would have caught it.
- **Run the tests (and the app) before claiming a task is done.** "It should work" is not "it works." Actually exercise the flow.
- **Test the edge cases explicitly:** HEIC and no-extension files, very large files, offline/interrupted upload, empty library, zero search results, an off-catalog plant, a video, a huge batch, a revoked/expired share link, an unauthorized user hitting a protected route.
- **Verify against the real sample photos** (the ~100 real Planterie assets), not just synthetic ones — that's where tag quality is proven.
- **Definition of Done per feature:** implemented + typed + lint-clean + tested (unit + the relevant flow) + error/empty states handled + works on mobile + secure + `PROGRESS.md` updated.
  **Human approval gates**
- Ask before anything destructive or irreversible: deleting assets, changing roles, running DB migrations that drop/alter data, or (v2) publishing to Shopify.

---

## 13. Testing & QA plan (from thinking to final)

**Layered testing**

- **Unit:** tagging JSON parse + validation; confidence→review routing; HEIC/resize logic; share-link token/expiry; permission checks.
- **Integration:** API routes (auth, upload, tag callback, search, share create/revoke) against a test DB.
- **End-to-end (Playwright):** the core journeys — sign in; capture/drop a batch; see it tagged; clear a review item; search and filter; share a set and open the link; unauthorized access is blocked.
- **Manual device pass:** real phone (iOS Safari + Android Chrome) for camera capture, HEIC upload, offline queue, and the gallery.
  **Acceptance criteria for v1** (all must pass)
- A batch of mixed real photos (incl. a HEIC and a video) captures/uploads with none lost, even with a dropped connection.
- Core catalog plants/pots tag correctly at high confidence; off-catalog items route to review.
- Tags are editable; edits persist.
- Search/filter by plant, pot, event, type, people, setting, and date returns correct results, singly and combined.
- A share link opens for the recipient, downloads work, and revoking it kills access.
- No route is reachable without login; a Member cannot perform Admin-only actions.
- No secret appears in the client bundle; buckets are private.
  **Pre-launch checklist**
- All tests green; `npm audit` clean of criticals; env vars set in prod; storage/DB backups on; error monitoring on; a real end-to-end run on a phone completed; a rollback plan noted.

---

## 14. Build order / milestones

Build in this order; fully finish and test each before the next.

1. **Scaffold** — Next.js + TS + lint/format + CI; deploy a hello-world to hosting; set up env handling.
2. **Auth + roles** — sign-in, protected routes, Admin/Member, audit-log skeleton.
3. **Data model + storage** — Postgres schema, object storage wired, signed URLs.
4. **Upload + capture + queue** — drag/drop, camera, batch context sheet, HEIC/resize, upload queue with retries. (Prove: nothing gets lost.)
5. **Tagging pipeline** — async job, vision model + catalog + context, schema parse, write tags, thumbnails for video. (Prove: quality on real photos.)
6. **Review queue** — surface low-confidence/off-catalog, confirm/edit, promote to catalog.
7. **Library + search** — gallery, tag filters, combined search, asset detail with editable tags.
8. **Share** — links with expiry/revoke, download/zip, WhatsApp/email.
9. **Catalog management + settings** — editable vocab, users, model config.
10. **Polish + full test pass + device pass + deploy v1.**
    Then, only after v1 is live and used: **v2 Shopify** (with approval gate), **v3 Meta / photoshoots / semantic search**.

---

## 15. Which model to use

Two different things, two different answers.
**For building the app (Claude Code):**

- **Daily driver: Claude Sonnet 5** (`claude-sonnet-5`) — fast, strong at code, cost-effective for the bulk of the work.
- **Planning & hard problems: Claude Opus 4.8** (`claude-opus-4-8`) — use for the initial architecture/plan and for gnarly debugging, then switch back to Sonnet.
- This is your Claude Code subscription/usage, separate from the app — it is **not** an app runtime cost.
  **For runtime tagging (the app calls this per photo) — keep it free:**
- **Google Gemini Flash / Flash-Lite, free tier.** No credit card, no expiration, accepts image input. Free-tier limits are roughly **15 requests/minute, 1M tokens/minute, and 1,500 requests/day** — far more than ~300 photos/week (~43/day) needs. Use `gemini-flash-lite` for the extra throughput headroom, or `gemini-flash` for a bit more quality; test both on the real photos.
- **Because it's a closed-list match** ("which of these catalogued plants/pots is this?") rather than open-ended identification, a Flash-class model is accurate enough — and the review queue catches the rest. That's the whole reason a free model works here.
- **Build a request queue** with rate limiting and **exponential backoff on 429** errors — never fire parallel bursts. The free tier has **no SLA**, so add retries and a graceful fallback for occasional unavailability.
- **Data-privacy caveat (important):** Gemini free-tier inputs may be used by Google to improve its models, and human reviewers may see them. That's fine for plant and stock photos. For photos with **people (events/workshops, including children)**, either confirm with Himank that this is acceptable or route those through a private path — the paid Gemini Flash tier (a few cents, no training on your data) or another provider. Never send anything truly sensitive through the free tier.
- **Keep the provider and model in environment variables** (`TAGGING_PROVIDER`, `TAGGING_MODEL`) so switching from free Gemini → paid Gemini → a different provider is a config change, not a code change.
- Gemini supports a JSON/structured-output mode — use it to enforce the schema in Section 8.3.
  Verify current free-tier limits and model names before launch (they change): Gemini at https://ai.google.dev/gemini-api/docs/rate-limits ; Claude models at https://docs.claude.com/en/api/overview.

---

## 16. Definition of Done for v1

The tool is "done" for v1 when a non-technical staff member can, on their phone: capture or drop an event's photos, watch them get tagged, fix anything flagged in a few taps, find any asset by its tags, and share a set — all without renaming a single file, with nothing ever lost, behind a login, on a stack costing on the order of $0–20/month. Everything in Section 13's acceptance criteria passes.
---

## 17. Open questions to confirm with Himank (don't block the build)

- **Budget ceiling** — comfortable monthly number (decides Vercel Pro vs Cloudflare/Netlify free, and paid DB/storage tiers vs free).
- **Maintenance owner** — who runs this after handover (you/agency vs Planterie). A custom app needs an owner; this shapes how much is locked down and automated.
- **First priority** — finding vs sharing (both are in v1; this just orders polish).
- **Shopify specifics (for v2)** — how a tag should map to a product/collection, and who approves publishes.

---

## Appendix A — Controlled vocabulary (seed lists)

Pulled from the live planterie.in catalog. This is a starting point; make it editable in-app and extend with flowering/seasonal stock as it appears.
**Plants:** Aglaonema (Lipstick, Angel, Firework, Red-Pink), ZZ Plant, Peacock Calathea, Calathea (incl. Triostar), Lemonlime / Oxycardium (Lemon Lime), Oxycardium Brasil, Rubber Plant, Peace Lily, Monstera Adansonii, Aralia, Dwarf Palm, Fittonia, Ficus Ginseng, Fern, Snake Plant, Pothos / Money Plant, Syngonium, Jade, Spider Plant, Areca Palm, Philodendron. _(Extend with: Kalanchoe, Anthurium, Poinsettia, Blood Lily and other seasonal/flowering stock.)_
**Pots / jars / planters:** White Java, Blue Cylinder, Leafy Quad, Cement Nose, Urn, Charcoal, Charcoal Etch, Cat Face, Book planter, Blue Trough, Brown Tribal, Floral Basin, Grey Geo, Black Blockprint, Grey Diamond, Panditji, Playful Fish, Ceramic Mandala. _(Plus generic containers for stock/event shots: nursery grow bag, plastic pot, glass terrarium jar, woven/seagrass basket, terracotta pot.)_
**Asset types:** Website/Product · Stock–Plants · Stock–Pots/Jars · Customer Sends · Social · Raw Clips · Plantscaping Projects · Event Coverage.
**Naming convention (product shots):** "{Plant} in {Pot}" — e.g. "Peacock Calathea in Leafy Quad". Terrariums/bonsai use themed names (e.g. "Panda Sanctuary", "Riverside Bridge House Bonsai").
---

## Appendix B — Tagging prompt template (server-side)

```
You are an image tagger for Planterie, a plant studio and cafe. Tag this photo for an internal asset library.
Batch context (already known — do not re-derive): asset type = {ASSET_TYPE}; event = {EVENT_NAME_DATE}; project = {PROJECT_NAME}.
Match PLANTS only to this list (closest name; if clearly none, set in_catalog=false with a generic name):
{PLANT_LIST}
Match the CONTAINER (pot/jar/planter) only to this list (else in_catalog=false with a generic description):
{POT_LIST}
Pick the single most likely category from: {CATEGORY_LIST}.
Return ONLY valid minified JSON, no markdown, no commentary, exactly these keys:
{"plants":[{"name":"","in_catalog":true,"confidence":"high|medium|low"}],"container":{"name":"","in_catalog":true,"confidence":"high|medium|low"},"people":{"present":false,"count":"none|one|few|many"},"food_or_drink":false,"styling":"styled|plain","environment":"indoor|outdoor|studio|unclear","bulk":false,"colours":["max 3"],"theme_tags":["max 5 short lowercase"],"category_guess":"","caption":"max 12 words"}
Rules: styling "styled" = deliberately set up for a shoot; "plain" = quick operational/stock photo. bulk=true if many units/lots of stock are visible. If no plant is visible, plants=[]. If no distinct decorative container, container=null. Never invent event or project names.
```

---

## Appendix C — Environment variables (server-side only)

`DATABASE_URL`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `GEMINI_API_KEY`, `TAGGING_PROVIDER` (e.g. `gemini`), `TAGGING_MODEL` (e.g. `gemini-flash-lite`), `AUTH_SECRET`, `APP_URL`. (Shopify/Meta keys added in v2/v3.) None of these may ever be exposed to the browser. Note: the Claude Code models used to _build_ the app are not app env vars — they're your Claude Code subscription.
