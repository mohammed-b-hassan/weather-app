import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { MemoryRecentSearchStore } from './memory-store';
import { SqliteRecentSearchStore } from './sqlite-store';
import { MAX_RECENT, type RecentSearchStore } from './recent-searches';
import type { City } from '@/lib/types';

function city(name: string, lat: number, lon: number, state?: string): City {
  return { name, country: 'TS', lat, lon, state };
}

function describeStore<T extends RecentSearchStore>(
  label: string,
  create: () => T,
  dispose: (store: T) => void,
) {
  describe(label, () => {
    let store: T;

    beforeEach(() => {
      store = create();
    });

    afterEach(() => {
      dispose(store);
    });

    test('starts empty', async () => {
      expect(await store.list()).toEqual([]);
    });

    test('lists the most recently added city first', async () => {
      await store.add(city('Paris', 48.8566, 2.3522));
      await store.add(city('London', 51.5073, -0.1277));

      expect((await store.list()).map((entry) => entry.name)).toEqual([
        'London',
        'Paris',
      ]);
    });

    test('deduplicates cities that round to the same coordinates', async () => {
      await store.add(city('Paris', 48.8566, 2.3522));
      await store.add(city('Paris Centre', 48.857, 2.3525));

      const stored = await store.list();

      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('Paris Centre');
    });

    test('moves an existing city back to the front when searched again', async () => {
      await store.add(city('Paris', 48.8566, 2.3522));
      await store.add(city('London', 51.5073, -0.1277));
      await store.add(city('Tokyo', 35.6828, 139.759));
      await store.add(city('Paris', 48.8566, 2.3522));

      expect((await store.list()).map((entry) => entry.name)).toEqual([
        'Paris',
        'Tokyo',
        'London',
      ]);
    });

    test('keeps at most MAX_RECENT cities, discarding the oldest', async () => {
      for (let index = 0; index < MAX_RECENT + 2; index += 1) {
        await store.add(city(`City ${index}`, index, index));
      }

      const stored = await store.list();

      expect(stored).toHaveLength(MAX_RECENT);
      expect(stored[0].name).toBe(`City ${MAX_RECENT + 1}`);
      expect(stored[MAX_RECENT - 1].name).toBe('City 2');
    });

    test('round trips an optional state', async () => {
      await store.add(city('Toronto', 43.6532, -79.3832, 'Ontario'));
      await store.add(city('Berlin', 52.52, 13.405));

      const [berlin, toronto] = await store.list();

      expect(berlin.state).toBeUndefined();
      expect(toronto.state).toBe('Ontario');
    });

    test('does not expose its internal array to callers', async () => {
      await store.add(city('Paris', 48.8566, 2.3522));

      const stored = await store.list();
      stored.length = 0;

      expect(await store.list()).toHaveLength(1);
    });
  });
}

describeStore(
  'MemoryRecentSearchStore',
  () => new MemoryRecentSearchStore(),
  () => {},
);

describeStore(
  'SqliteRecentSearchStore',
  () => {
    let tick = 0;
    return new SqliteRecentSearchStore(':memory:', () => (tick += 1));
  },
  (store) => store.close(),
);
