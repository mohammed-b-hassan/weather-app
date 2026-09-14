import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { MAX_RECENT, type RecentSearchStore } from './recent-searches';
import type { City } from '@/lib/types';
import { cityKey } from '@/lib/format';

/** Shape of a row as SQLite returns it — SQL has no `undefined`, only NULL. */
interface RecentSearchRow {
  name: string;
  country: string;
  state: string | null;
  lat: number;
  lon: number;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recent_searches (
    key         TEXT    PRIMARY KEY,
    name        TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    state       TEXT,
    lat         REAL    NOT NULL,
    lon         REAL    NOT NULL,
    searched_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_recent_searched_at
    ON recent_searches (searched_at DESC);
`;

/**
 * Recent searches backed by Bun's built-in SQLite driver.
 *
 * Only constructible under the Bun runtime. `getStore()` imports this module
 * dynamically and falls back to the in-memory store when the import or the
 * constructor fails (e.g. a read-only filesystem), so nothing here needs to
 * guard for a non-Bun environment.
 */
export class SqliteRecentSearchStore implements RecentSearchStore {
  private readonly db: Database;
  private readonly now: () => number;

  constructor(path: string, now: () => number = Date.now) {
    this.now = now;

    // `:memory:` has no parent directory to create.
    if (path !== ':memory:') {
      mkdirSync(dirname(path), { recursive: true });
    }

    this.db = new Database(path, { create: true });
    // WAL lets reads proceed during a write; harmless for a single-writer app.
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(SCHEMA);
  }

  async list(): Promise<City[]> {
    const rows = this.db
      .query<RecentSearchRow, []>(
        `SELECT name, country, state, lat, lon
           FROM recent_searches
          ORDER BY searched_at DESC, rowid DESC
          LIMIT ${MAX_RECENT}`,
      )
      .all();

    return rows.map((row: RecentSearchRow) => ({
      name: row.name,
      country: row.country,
      state: row.state ?? undefined,
      lat: row.lat,
      lon: row.lon,
    }));
  }

  async add(city: City): Promise<void> {
    // Upsert then prune, as one unit: a failed prune must not leave a 6th row
    // visible to a concurrent reader.
    this.db.transaction(() => {
      this.db.run(
        `INSERT INTO recent_searches (key, name, country, state, lat, lon, searched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           name        = excluded.name,
           country     = excluded.country,
           state       = excluded.state,
           searched_at = excluded.searched_at`,
        [
          cityKey(city),
          city.name,
          city.country,
          city.state ?? null,
          city.lat,
          city.lon,
          this.now(),
        ],
      );

      // Searching an existing city re-dates it rather than adding a row, so the
      // table only grows on genuinely new cities — but prune unconditionally to
      // keep the cap true regardless of how rows got there.
      this.db.run(
        `DELETE FROM recent_searches
          WHERE key NOT IN (
            SELECT key FROM recent_searches
             ORDER BY searched_at DESC, rowid DESC
             LIMIT ${MAX_RECENT}
          )`,
      );
    })();
  }

  /** Release the file handle. Used by tests; production holds one instance. */
  close(): void {
    this.db.close();
  }
}
