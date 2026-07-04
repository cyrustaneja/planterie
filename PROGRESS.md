# Progress — Planterie Asset Studio

## Done

- `CLAUDE.md` and `PRD.md` saved to repo root.
- **Milestone 1 (Scaffold) complete:**
  - Next.js 16.2.10 + React 19.2.4, TypeScript strict mode, App Router, `src/` dir, Tailwind v4.
  - ESLint (`eslint-config-next`) + Prettier wired together (`eslint-config-prettier`), zero lint errors. `npm run lint` / `npm run format` / `npm run format:check`.
  - `.env.example` with all Appendix C vars; `src/env.ts` validates required server env vars at import time (fails fast, no silent `undefined`), guarded with `server-only`.
  - Brand tokens (Section 10 palette) wired into `src/app/globals.css` as Tailwind v4 `@theme` tokens (`pine`, `pine-deep`, `gold`, `canvas`, `surface`, `ink`, `sage`, `slate`, `line`). Fonts: Fraunces (display), Inter (UI/body), Geist Mono (tag/data values) via `next/font/google`.
  - Hello-world page (`src/app/page.tsx`) confirms tokens/fonts render; verified via `npm run build` and a local `npm run dev` request.
  - Cloudflare deploy tooling installed: `@opennextjs/cloudflare` (current recommended adapter, supports Next ≥16.2.6 — the legacy `@cloudflare/next-on-pages` does not support Next 16). `wrangler.jsonc` + `open-next.config.ts` added, `npm run deploy` / `npm run preview` scripts added.
  - `wrangler login` completed (account: cyrus.taneja@kraftshala.com).
  - `npm audit fix` applied — resolved all high-severity issues (undici, ws). 4 moderate issues remain, all inside Next's own bundled `postcss` dependency chain (not a direct/exploitable dependency for this app); no criticals.

## Next

- **Live deploy blocked:** the Cloudflare account has no `workers.dev` subdomain registered yet — required once per account before any Worker/Pages deploy. Attempted via https://dash.cloudflare.com/2c0886e5eb6087a019f925d9bb766c89/workers/onboarding but couldn't complete it in the browser. Needs Himank/account owner to register a subdomain in the Cloudflare dashboard (Workers & Pages → Onboarding), then run `npm run deploy` to finish Milestone 1.
- After that: **Milestone 2 — Auth + roles** (Supabase Auth sign-in, protected routes, Admin/Member, audit-log skeleton).

## Decisions

- Hosting: Cloudflare Pages/Workers via `@opennextjs/cloudflare` (Vercel Hobby is non-commercial; Pro adds $20/user/mo). `next-on-pages` ruled out — no Next 16 support.
- DB: Supabase Postgres.
- Storage: Cloudflare R2 (private buckets, signed URLs, no egress fees).
- Auth: Supabase Auth (email sign-in, pairs with Supabase DB).

## Known issues

- Live Cloudflare deploy pending account-owner action (see "Next" above). Everything else in Milestone 1 is verified locally (lint, build, dev).
