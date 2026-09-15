# Weather Dashboard

City search with current conditions and a 5-day forecast. Next.js 16 (App Router),
Bun, TypeScript, Tailwind v4.

**Live:** https://weather-app-ten-vert-94.vercel.app

## Quick start

```bash
bun install
cp .env.example .env.local   # add your OpenWeatherMap key
bun run dev
```

An API key is the only thing you need to supply — free from
[openweathermap.org/api](https://openweathermap.org/api). Everything else has a
default.

```bash
bun run test       # 67 tests
bun run lint
bun run typecheck
bun run build
```

| Variable | Required | Default |
|---|---|---|
| `OPENWEATHER_API_KEY` | yes | — |
| `OPENWEATHER_API_BASE_URL` | no | `https://api.openweathermap.org` |
| `CACHE_TTL_SECONDS` | no | `600` |
| `DB_PATH` | no | `./data/recent.db` |

`OPENWEATHER_API_BASE_URL` is configurable so tests can point at a stub instead of the
real upstream.

---

## Architecture

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

Route handlers do one thing: parse the request, call a service, convert errors to a
response. Everything else lives under `lib/`, and nothing there knows about HTTP.

**OpenWeatherMap's shape stops at `lib/weather/`.** `schema.ts` describes what the API
actually sends — snake_case, `temp`, `feels_like`, Unix timestamps. `lib/types.ts`
describes what the app works with: camelCase, units in the field names (`tempC`,
`windSpeedMs`). `normalize.ts` is the only place the two meet, so swapping providers
means changing three files and no components.

**Both boundaries validate with zod.** Upstream responses go through `safeParse`, so an
unexpected shape becomes a 502 rather than a `TypeError` in a render. Requests do too —
`request.json()` returns `any`, and passing that downstream is how untyped data gets
into a typed codebase. Both directions share one `parseOrThrow` with the error code as
an argument, so a bad response is blamed on the upstream and a bad request on the
caller.

**One error taxonomy.** `AppError` maps a code to an HTTP status and a user-facing
message; handlers convert once at the edge. `Error.message` never reaches a client —
responses carry `publicMessage`, the internal detail goes to the server log. Upstream
401/403 becomes a 502, not a 401: a rejected key is our misconfiguration, not the
user's problem.

**Caching** is a 10-minute TTL keyed on coordinates rounded to ~1km, so `"paris"`,
`"Paris"` and a nearby GPS fix share one entry. Next 16 no longer caches `fetch`
implicitly, so this had to be explicit anyway, and a standalone class takes an
injectable clock — expiry is testable without sleeping. It lives on `globalThis`: Next
bundles the Server Component graph and the route handlers separately, so module scope
is evaluated twice per instance and you get two caches instead of one.

**Recent searches** sit behind a `RecentSearchStore` interface with two
implementations: `bun:sqlite` locally, in-memory elsewhere. Vercel runs Next functions
on Node, where `bun:sqlite` doesn't exist, so the deployed app quietly uses the memory
store. One shared test suite runs against both — that's what makes the fallback safe
rather than hopeful.

**Server Components.** `page.tsx` reads the theme cookie and the recent searches
directly on the server, so neither needs a client round-trip. Anything interactive —
the search combobox, the results state machine — is a Client Component.

**Geolocation** runs on first load. `/api/weather` accepts either `?city=` or
`?lat=&lon=`, and the coordinate path needs no extra upstream call because the forecast
response already carries the city name. `maximumAge` is five minutes rather than the
default `0`, which would force a fresh fix on every load — right for navigation, wasteful
here. If location is denied, times out, or isn't available, the page says which and
falls back to search.

**Theming** is Light/Dark, stored in a cookie so the server renders `data-theme` in the
initial HTML — no flash, and no blocking script in `<head>` reading `localStorage`
before paint. Colours are declared once with `light-dark()`; the toggle flips
`color-scheme`.

---

## API

| Method | Path | Returns |
|---|---|---|
| `GET` | `/api/weather?city=<name>` | Current conditions, 5-day forecast, `cached` flag |
| `GET` | `/api/weather?lat=<n>&lon=<n>` | The same, for a coordinate pair |
| `GET` | `/api/suggest?q=<prefix>` | Up to 5 geocoding matches |
| `GET` | `/api/searches` | Last 5 searched cities |
| `POST` | `/api/searches` | Records a search |

Every response uses the same envelope and sets a matching HTTP status:

```ts
{ status: number, errorObject: { error, code } | null, data: T | null }
```

One shape means one parsing path on the client instead of a per-endpoint guess at what
an error looks like.

## Testing

`bun test` — 67 tests on Bun's built-in runner. No server, network, or API key needed:
the cache and the SQLite store take an injectable clock, and the mapping and validation
layers are pure.

They target the zod schemas and the API contract rather than implementation details:

- **Request validation** — coordinates out of range or `NaN`, numbers sent as strings,
  blank names, missing or overlong parameters, a body that isn't JSON, a `searchTerm`
  that's a bare string instead of a city. Each has to be a 400 with a user-facing
  message and the zod detail kept server-side.
- **The error taxonomy** — each code's status, upstream status → code, and that no
  internal message reaches a client for any throw shape.
- **Normalisation** — the parts easy to get wrong: bucketing 3-hourly entries
  by the city's local calendar rather than UTC, picking the entry nearest local noon,
  and dropping a partial first day only when a sixth exists to replace it.
- **The cache**, on a fake clock, and **both stores** against one shared suite.

---

## What I'd change

**Use an ORM.** `bun:sqlite` with hand-written SQL was the right call for a take-home
that asks for no external database, and it picks up the Bun bonus. On a real project
I'd reach for Prisma or Drizzle — migrations, generated types, and one less place to
hand-maintain a row interface that has to stay in sync with a domain type.

**Not store recent searches on the server.** This is the one I'd push back on. Recents
are per-browser and nobody else reads them, so `localStorage` or `sessionStorage` is
the honest home — no database, no per-instance caveat. Server storage earns its keep
once there's something to justify it: recents shared across a user's devices, a login
to attach them to, or another service reading them. Without that it's infrastructure
bought for nothing. I built it server-side because the brief asked for it, and the
interface makes moving it small.

**Share the cache and the store.** Both are per-instance, which is the main gap between
local behaviour and the deployed link — every cold start on Vercel begins empty. Redis
or Upstash for the cache, Postgres for anything that has to outlive an instance.

**Rate-limit `/api/suggest`.** It proxies a third-party geocoding API on every keystroke
past the debounce. Fine for one user, not for a public URL.

**Retry geolocation from the UI.** It runs once on mount, so a timeout currently means
reloading the page.

**Screen-reader testing.** The combobox follows the ARIA pattern but has only been
checked by reading the markup.

---

## Tools

VS Code, Claude Code, and the Next.js and Bun docs.

I've worked with Next.js 14, so the App Router itself was familiar; 16 and Bun weren't.
The docs covered what actually changed between them — `fetch` no longer cached by
default, which is why the TTL cache is explicit, and async `cookies()`, which the theme
reads on the server — plus Bun's `bun:sqlite` and test runner. Claude Code was used as
a pair programmer for writing and reviewing code and running the checks.
