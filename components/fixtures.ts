import type { City } from '@/lib/types';

/**
 * Fallback for the very first paint: no `?city=` in the URL and nothing in the
 * recent-search store yet. Both suggestions and recent searches now come from
 * their own routes, so this constant is all that remains hardcoded.
 */
export const DEFAULT_CITY: City = {
  name: 'Amman',
  country: 'JO',
  lat: 31.9522,
  lon: 35.9339,
};
