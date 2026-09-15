# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Package manager is **bun** (`packageManager: bun@1.4.2`). Use `bun` / `bunx`, not npm.

```bash
bun install
bun run dev        # next dev (--bun, so bun:sqlite is available)
bun run build      # next build
bun run start      # next start (needs a prior build)
bun run lint       # eslint (flat config, eslint.config.mjs)
bun run typecheck  # tsc --noEmit
bun run test       # bun's built-in runner — 67 tests, no network or API key needed
```

Tests are `*.test.ts` beside the module they cover. They stay offline: the cache and the
SQLite store take an injectable clock, and the mapping and validation layers are pure.

## Environment

`OPENWEATHER_API_KEY` is the only value you must supply; see `.env.example` for the rest.
All `.env*` files are gitignored except `.env.example`, and `/data` (the SQLite file) is
ignored too.

| Variable | Read in | Notes |
|---|---|---|
| `OPENWEATHER_API_KEY` | `lib/weather/client.ts` | Required; `AppError('INTERNAL')` at call time when missing |
| `OPENWEATHER_API_BASE_URL` | `lib/weather/client.ts` | Same throw when missing — point it at a stub to exercise the client without the real upstream |
| `CACHE_TTL_SECONDS` | `lib/weather/service.ts` | Falls back to 600 only when *unset*; an empty string reads as `0` and disables the cache |
| `DB_PATH` | `lib/store/recent-searches.ts` | Defaults to `./data/recent.db` |

## Architecture

Next.js 16 App Router. Deliberately layered, one direction only:

```
app/page.tsx ─┐
              ├─→ lib/weather/service.ts ─→ lib/weather/client.ts ─→ OpenWeatherMap
app/api/*     ─┘          │         │                  │
                          │         │           schema.ts (zod: wire shapes)
                     lib/cache  lib/store              │
                       TtlCache   RecentSearchStore  normalize.ts
                                  ├─ sqlite                │
                                  └─ memory          lib/types.ts (domain shapes)
```

Rules this structure encodes — keep them when adding code:

- **Route handlers do three things:** parse the request, call a service, convert errors to a
  response. Nothing under `lib/` knows about HTTP.
- **OWM's wire shape never escapes `lib/weather/`.** `schema.ts` holds zod schemas for the raw
  OpenWeatherMap payloads (snake_case, `temp`/`feels_like`/`dt`); `lib/types.ts` holds the domain
  shapes the rest of the app sees (`City`, `CurrentWeather`, `ForecastDay`, `WeatherSnapshot` —
  camelCase, explicit units like `tempC`, `windSpeedMs`). `normalize.ts` is the only place the two
  meet.
- **Both boundaries validate with zod.** Upstream responses and incoming requests both go through
  `parseOrThrow` (`lib/utils.ts`), which takes the `ErrorCode` as an argument — a bad response is
  blamed on the upstream (`UPSTREAM_UNAVAILABLE`, 502), a bad request on the caller
  (`INVALID_INPUT`, 400). Request schemas live in `lib/request-schema.ts`.
- **One error taxonomy.** `lib/response-handler.ts` owns `ErrorCode` → HTTP status → user-facing
  message. Throw `AppError` anywhere; route handlers convert once via `toErrorResponse`, which also
  logs non-`AppError` throws. `fromUpstreamStatus` maps upstream HTTP status to our codes — note
  401/403 become `UPSTREAM_UNAVAILABLE` because a bad API key is our fault, never the user's. Never
  surface `Error.message` to clients; use `publicMessage`.
- **One response envelope.** Every route returns
  `{ status, errorObject: { error, code } | null, data: T | null }` (`ApiEnvelope<T>`) with a
  matching HTTP status, so the client has one parsing path.
- **Fetches are explicit.** `getJson` sets `cache: 'no-store'` and an 8s `AbortSignal.timeout`;
  timeouts map to `UPSTREAM_TIMEOUT`. Next 16 no longer caches `fetch` implicitly, which is why the
  TTL cache below is ours rather than the framework's.

Imports use the `@/*` path alias rooted at the repo root (`@/lib/response-handler`). Some modules
still use relative paths; prefer the alias in new code.

## Decisions already made

- **Cache:** `lib/cache/ttl-cache.ts`, 10-minute TTL keyed on coordinates rounded to 2dp
  (`coordKey`), so `"paris"`, `"Paris"` and a nearby GPS fix share an entry. Held on `globalThis`
  because Next bundles the Server Component graph and the route handlers separately, so module
  scope evaluates twice per instance. Per-instance; Redis/Upstash is the production answer.
  Known gap: the `?city=` path geocodes through `getCity` *before* the cache lookup, so a cached
  city still costs one upstream geocode call.
- **Recent searches:** behind the `RecentSearchStore` interface (`list` / `add`, capped at
  `MAX_RECENT = 5`, deduped by `coordKey`). `bun:sqlite` locally; `getStore()` falls back to the
  in-memory store when the dynamic import or the constructor fails — which is what happens on
  Vercel, where Next functions run on Node. One shared test suite runs against both
  implementations; keep it that way when changing either.
- **Server Components:** `app/page.tsx` reads the theme cookie and the recent searches directly on
  the server, so first paint needs no client fetch. Everything interactive — `components/
  search-bar.tsx` (ARIA combobox, 300ms debounce) and `components/weather-view.tsx` (the results
  state machine, geolocation, optimistic recents) — is a Client Component.
- **Theming:** Light/Dark in a `theme` cookie, read by `lib/theme.ts` and rendered as
  `data-theme` on `<html>`, so there is no flash and no blocking script. Colours are declared once
  with `light-dark()` in `app/globals.css`; the toggle flips `color-scheme`.

## Routes

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/weather?city=<name>` \| `?lat=&lon=` | `WeatherSnapshot` — current, 5-day forecast, `cached` flag |
| `GET` | `/api/suggest?q=<prefix>` | Up to 5 geocoding matches (`City[]`) |
| `GET` | `/api/searches` | Last 5 searched cities |
| `POST` | `/api/searches` | Records a search (`{ searchTerm: City }`) |

## Styling

Tailwind v4 via `@tailwindcss/postcss`. No `tailwind.config` — tokens and the `@theme inline`
block live in `app/globals.css`.
