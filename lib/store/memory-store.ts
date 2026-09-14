import { coordKey } from '../utils';
import { MAX_RECENT, type RecentSearchStore } from './recent-searches';
import type { City } from '@/lib/types';

/**
 * Fallback for runtimes without `bun:sqlite` (Node on Vercel, for instance).
 *
 * Deliberately mirrors the SQLite store's semantics — dedupe by rounded
 * coordinates, most-recent-first, capped at MAX_RECENT — so swapping
 * implementations can't change observable behaviour. The shared test suite
 * runs against both.
 *
 * Contents live for the lifetime of the process, so on serverless each
 * instance keeps its own list. See README for why that's accepted here.
 */
export class MemoryRecentSearchStore implements RecentSearchStore {
  private cities: City[] = [];

  async list(): Promise<City[]> {
    // Copy so callers can't mutate our internal array through the result.
    return this.cities.map((city) => ({ ...city }));
  }

  async add(city: City): Promise<void> {
    const key = coordKey(city.lat, city.lon);
    const withoutDuplicate = this.cities.filter(
      (existing) => coordKey(existing.lat, existing.lon) !== key,
    );
    this.cities = [{ ...city }, ...withoutDuplicate].slice(0, MAX_RECENT);
  }
}
