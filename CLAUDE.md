# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **bun** (`packageManager: bun@1.3.13`). Use `bun` / `bunx`, not npm.

```bash
bun install
bun run dev        # next dev
bun run build      # next build
bun run start      # next start (needs a prior build)
bun run lint       # eslint (flat config, eslint.config.mjs)
bunx tsc --noEmit  # typecheck — no script for this yet
```

No test runner is wired up yet. The README plans `bun test` (bun's built-in runner); if you add tests, add a `test` script.

## Environment

`OPENWEATHER_API_KEY` is required — `lib/weather/client.ts` throws `AppError('INTERNAL')` at call time when it is missing. All `.env*` files are gitignored; there is no `.env.example` yet despite the README referencing one.

## Architecture

Next.js 16 App Router. Deliberately layered, one direction only:

```
app/api/*/route.ts   →   lib/weather/client.ts   →   OpenWeatherMap HTTP
      ↓                         ↓
 lib/errors.ts            lib/weather/schema.ts
      ↑                         ↓
      └──────── lib/types.ts (domain shapes)
```

Rules this structure encodes — keep them when adding code:

- **OWM's wire shape never escapes `lib/weather/`.** `schema.ts` holds zod schemas for the raw OpenWeatherMap payloads (snake_case, `temp`/`feels_like`/`dt`); `lib/types.ts` holds the domain shapes the rest of the app sees (`City`, `CurrentWeather`, `ForecastDay`, `WeatherSnapshot` — camelCase, explicit units like `tempC`, `windSpeedMs`). Mapping between them happens in the client/service layer.
- **Validate at the boundary.** Every upstream response goes through `safeParse`; a parse failure is an `AppError('UPSTREAM_UNAVAILABLE')`, not a crash.
- **One error taxonomy.** `lib/errors.ts` owns `ErrorCode` → HTTP status → user-facing message. Throw `AppError` anywhere; route handlers convert once via `toErrorResponse`, which also logs non-`AppError` throws. `fromUpstreamStatus` maps upstream HTTP status to our codes — note 401/403 become `UPSTREAM_UNAVAILABLE` because a bad API key is our fault, never the user's. Never surface `Error.message` to clients; use `publicMessage`.
- **Fetches are explicit.** `getJson` sets `cache: 'no-store'` and an 8s `AbortSignal.timeout`; timeouts map to `UPSTREAM_TIMEOUT`. Next 16 no longer caches `fetch` implicitly, so caching is planned as an explicit TTL layer (see below) rather than relying on the framework.

Imports use the `@/*` path alias rooted at the repo root (`@/lib/errors`, not relative paths).

## Current state

The repo is mid-build; much of what the README describes is intent, not code.

Exists: `lib/types.ts`, `lib/errors.ts`, `lib/weather/{client,schema}.ts`, and `app/api/route.ts` (a scratch `GET` that calls `searchCities('amman')` — throwaway).

Empty stubs waiting to be written: `app/api/weather/route.ts`, `app/api/searches/route.ts`, `app/api/suggest/route.ts`. `app/page.tsx` is still the create-next-app template, and `components/` is empty.

Planned in the README, not yet built — follow these decisions rather than re-deciding them:

- 10-minute TTL cache keyed on rounded coordinates, as a standalone testable module (not Next's fetch cache). Per-instance; Redis/Upstash is the production answer.
- Recent searches behind a `RecentSearchStore` interface — `bun:sqlite` locally, in-memory fallback on Node.
- `app/page.tsx` as a Server Component reading the store directly so first paint has recent searches with no client fetch; search and results as client components.

Styling is Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config`; configuration lives in `app/globals.css`).
