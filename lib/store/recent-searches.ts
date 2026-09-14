import type { City } from '@/lib/types';

export const MAX_RECENT = 5;

export interface RecentSearchStore {
  list(): Promise<City[]>;
  add(city: City): Promise<void>;
}
const globalStore = globalThis as typeof globalThis & {
  __recentStore?: RecentSearchStore;
};
export async function getStore(): Promise<RecentSearchStore> {
  if (globalStore.__recentStore) return globalStore.__recentStore;
  try {
    const { SqliteRecentSearchStore } = await import('./sqlite-store');
    const instance = new SqliteRecentSearchStore(
      process.env.DB_PATH ?? './data/recent.db',
    );
    globalStore.__recentStore = instance;
    return instance;
  } catch (cause) {
    console.warn('SQLite store unavailable, falling back to memory:', cause);
  }

  const { MemoryRecentSearchStore } = await import('./memory-store');
  const instance = new MemoryRecentSearchStore();
  globalStore.__recentStore = instance;
  return instance;
}
