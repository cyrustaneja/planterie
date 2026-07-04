# Progress — Planterie Asset Studio

## Done

- `CLAUDE.md` and `PRD.md` saved to repo root.
- **Milestone 1 (Scaffold) complete, live and deployed:**
  - Next.js 16.2.10 + React 19.2.4, TypeScript strict mode, App Router, `src/` dir, Tailwind v4.
  - ESLint (`eslint-config-next`) + Prettier wired together (`eslint-config-prettier`), zero lint errors. `npm run lint` / `npm run format` / `npm run format:check`.
  - `.env.example` with all Appendix C vars; `src/env.ts` validates required server env vars at import time (fails fast, no silent `undefined`), guarded with `server-only`.
  - Brand tokens (Section 10 palette) wired into `src/app/globals.css` as Tailwind v4 `@theme` tokens (`pine`, `pine-deep`, `gold`, `canvas`, `surface`, `ink`, `sage`, `slate`, `line`). Fonts: Fraunces (display), Inter (UI/body), Geist Mono (tag/data values) via `next/font/google`.
  - Hello-world page (`src/app/page.tsx`) confirms tokens/fonts render.
  - Cloudflare deploy tooling installed: `@opennextjs/cloudflare` (current recommended adapter, supports Next ≥16.2.6 — the legacy `@cloudflare/next-on-pages` does not support Next 16). `wrangler.jsonc` + `open-next.config.ts` added, `npm run deploy` / `npm run preview` scripts added.
  - Git repo pushed to https://github.com/cyrustaneja/planterie.
  - `wrangler login` completed (account: cyrus.taneja@kraftshala.com). Deployed via `npm run deploy` — live at **https://planterie-asset-studio.cyrus-taneja.workers.dev**.
  - `npm audit fix` applied — resolved undici/ws high-severity issues, then re-pinned `wrangler` to `4.86.0` (see Known issues) which reintroduces them in dev tooling only. 4 moderate issues remain inside Next's own bundled `postcss` dependency chain; no criticals in app code.

## Next

- **Milestone 2 — Auth + roles** (Supabase Auth sign-in, protected routes, Admin/Member, audit-log skeleton).

## Decisions

- Hosting: Cloudflare Workers via `@opennextjs/cloudflare` (Vercel Hobby is non-commercial; Pro adds $20/user/mo). `next-on-pages` ruled out — no Next 16 support.
- DB: Supabase Postgres.
- Storage: Cloudflare R2 (private buckets, signed URLs, no egress fees).
- Auth: Supabase Auth (email sign-in, pairs with Supabase DB).
- App runs on Cloudflare's `workers.dev` subdomain for now (`planterie-asset-studio.cyrus-taneja.workers.dev`); a custom domain can be attached later without code changes.

## Known issues

- `wrangler` is pinned to `4.86.0` instead of latest (`4.107.0`) because the newer CLI requires Node ≥22, and this dev environment only has Node 20 available (installing Node 22 failed — sandbox has a read-only `/.cache`). This reintroduces `ws`/`undici` high-severity advisories, but only in the local deploy CLI/dev tooling, not in shipped app code or the browser bundle. **To fully resolve:** install Node 22 (e.g. via `nvm install 22` outside this sandbox) and run `npm install --save-dev wrangler@latest`.
- Accidentally killed a dev server for a different project (`OOGWAY AI` at `/Users/cyrustaneja/Desktop/Product/Oogway`) while stopping Planterie's local dev server with an overly broad `pkill -f "next dev"`. Restart it manually if needed.
