# Progress — Planterie Asset Studio

## Done

- `CLAUDE.md` and `PRD.md` saved to repo root.
- **Milestone 1 (Scaffold) complete, live and deployed:**
  - Next.js 16.2.10 + React 19.2.4, TypeScript strict mode, App Router, `src/` dir, Tailwind v4.
  - ESLint (`eslint-config-next`) + Prettier wired together (`eslint-config-prettier`), zero lint errors. `npm run lint` / `npm run format` / `npm run format:check`.
  - `.env.example` with all Appendix C vars; `src/env.ts` validates required server env vars at import time (fails fast, no silent `undefined`), guarded with `server-only`.
  - Brand tokens (Section 10 palette) wired into `src/app/globals.css` as Tailwind v4 `@theme` tokens (`pine`, `pine-deep`, `gold`, `canvas`, `surface`, `ink`, `sage`, `slate`, `line`). Fonts: Fraunces (display), Inter (UI/body), Geist Mono (tag/data values) via `next/font/google`.
  - Cloudflare deploy tooling: `@opennextjs/cloudflare` (current recommended adapter — legacy `@cloudflare/next-on-pages` does not support Next 16). `wrangler.jsonc` + `open-next.config.ts`, `npm run deploy` / `npm run preview`.
  - Git repo pushed to https://github.com/cyrustaneja/planterie.
  - Live at **https://planterie-asset-studio.cyrus-taneja.workers.dev**.
- **Milestone 2 (Auth + roles) complete, live and verified end-to-end:**
  - New Supabase project (`iucktwhinshnfnjhzfhi`), Postgres + Auth.
  - `supabase/migrations/0001_users_roles_audit.sql`: `public.users` (id/email/name/role, role check-constrained to `admin`/`member`), `public.audit_log` (actor/action/target/metadata), a trigger that auto-creates a `users` row (`role='member'`) on signup, and RLS on both tables (users: readable by any authenticated user, no client-side writes; audit_log: readable by admins only, writes only via the service-role client).
  - `src/lib/supabase/database.types.ts` — generated via `npm run supabase:types` (do not hand-edit); `src/lib/supabase/types.ts` holds the hand-written `UserRole` union + `isUserRole` narrowing guard, since the DB column is `text` with a CHECK constraint, not a Postgres enum.
  - `src/lib/supabase/server.ts` (Server Component/Action/Route Handler client) and `src/lib/supabase/service-role.ts` (bypasses RLS — audit log writes only).
  - Magic-link sign-in: `src/app/login/page.tsx` + `actions.ts` (`signInWithOtp`), `src/app/auth/callback/route.ts` (`exchangeCodeForSession`), `src/app/actions/sign-out.ts`.
  - `src/lib/get-current-user.ts` (`getCurrentUser`) + `src/lib/auth.ts` (`requireUser`, `requireAdmin`, `ForbiddenError`) — split into two files so the permission-check branch logic is unit-testable via `vi.mock`.
  - `src/lib/audit.ts` (`logAudit`) — writes via the service-role client, swallows failures (never blocks the action it's logging) after logging server-side context.
  - Root layout shows a signed-in top bar (email + sign out); `/` calls `requireUser()` and is the authenticated landing page.
  - Vitest added (`npm run test`) — 7 unit tests covering `requireUser`/`requireAdmin` branch logic and `logAudit`'s failure-swallowing.
  - Verified end-to-end on the live URL: unauthenticated request → redirected to `/login`; real magic-link email → clicked → signed in; promoted to `admin` via the Supabase SQL editor → confirmed the UI reflects it.

## Next

- **Milestone 3 — Data model + storage** (Cloudflare R2 wired up with signed URLs; `assets`/`batches`/`tags`/`asset_tags`/`catalog_plants`/`catalog_pots`/`share_links`/`jobs` tables).

## Decisions

- Hosting: Cloudflare Workers via `@opennextjs/cloudflare` (Vercel Hobby is non-commercial; Pro adds $20/user/mo). `next-on-pages` ruled out — no Next 16 support.
- DB: Supabase Postgres.
- Storage: Cloudflare R2 (private buckets, signed URLs, no egress fees) — not wired up yet (Milestone 3).
- Auth: Supabase Auth, **magic-link** sign-in (no passwords to manage/reset).
- App runs on Cloudflare's `workers.dev` subdomain for now; a custom domain can be attached later without code changes.
- **No middleware/proxy for route protection.** Next.js 16's `proxy` convention (renamed from `middleware`) always compiles to the Node.js runtime, and `@opennextjs/cloudflare` 1.20.1 doesn't yet support Node-runtime proxy (Cloudflare-side error: "Node.js middleware is not currently supported"). Route protection instead lives in each protected page/layout via `requireUser()`/`requireAdmin()` — same security guarantee, just enforced per-route instead of centrally. **Trade-off to revisit:** without middleware refreshing the Supabase session cookie on every request, a signed-in user's access token (default ~1hr TTL) may expire between Server Actions/Route Handlers (the only places that can refresh it), forcing an earlier-than-ideal re-login. Not a security bug — worst case is an extra sign-in prompt. Revisit if `@opennextjs/cloudflare` adds Node-runtime proxy support, or if this becomes a real annoyance.

## Known issues

- `wrangler` is pinned to `4.86.0` instead of latest (`4.107.0`) because the newer CLI requires Node ≥22, and this dev environment only has Node 20 available (installing Node 22 failed — sandbox has a read-only `/.cache`). This reintroduces `ws`/`undici` high-severity advisories, but only in the local deploy CLI/dev tooling, not in shipped app code or the browser bundle. **To fully resolve:** install Node 22 (e.g. via `nvm install 22` outside this sandbox) and run `npm install --save-dev wrangler@latest`.
- Session-refresh trade-off from dropping middleware — see Decisions above.
- Bootstrapping the first admin is a manual one-time step: sign up, then run `update public.users set role = 'admin' where email = '...'` in the Supabase SQL editor. No invite/user-management UI yet (that's Milestone 9).
