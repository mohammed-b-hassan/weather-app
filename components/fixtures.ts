import type { City } from '@/lib/types';

/**
 * TEMPORARY hardcoded stand-ins for two routes that don't exist yet.
 *
 * - `RECENT_SEARCHES` replaces `GET /api/searches`
 * - `SUGGESTION_POOL` replaces `GET /api/suggest?q=`
 *
 * `RECENT_SEARCHES` seeds the list in `weather-view.tsx`; `SUGGESTION_POOL`
 * backs `match()` in `search-bar.tsx`. When the routes land, swap those two
 * reads for fetches returning `City[]` and delete this file.
 */

export const RECENT_SEARCHES: City[] = [
  { name: 'Amman', country: 'JO', lat: 31.9522, lon: 35.9339 },
  { name: 'London', country: 'GB', lat: 51.5073, lon: -0.1277 },
  { name: 'Tokyo', country: 'JP', lat: 35.6828, lon: 139.759 },
  { name: 'Cairo', country: 'EG', lat: 30.0444, lon: 31.2357 },
  { name: 'Berlin', country: 'DE', lat: 52.52, lon: 13.405 },
];

export const SUGGESTION_POOL: City[] = [
  ...RECENT_SEARCHES,
  { name: 'Aqaba', country: 'JO', lat: 29.5321, lon: 35.0061 },
  { name: 'Irbid', country: 'JO', lat: 32.5556, lon: 35.85 },
  { name: 'Zarqa', country: 'JO', lat: 32.0728, lon: 36.088 },
  { name: 'Dubai', country: 'AE', lat: 25.2048, lon: 55.2708 },
  { name: 'Doha', country: 'QA', lat: 25.2854, lon: 51.531 },
  { name: 'Riyadh', country: 'SA', lat: 24.7136, lon: 46.6753 },
  { name: 'Istanbul', country: 'TR', lat: 41.0082, lon: 28.9784 },
  { name: 'Paris', country: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038 },
  { name: 'Rome', country: 'IT', lat: 41.9028, lon: 12.4964 },
  { name: 'Lisbon', country: 'PT', lat: 38.7223, lon: -9.1393 },
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lon: 4.9041 },
  { name: 'Oslo', country: 'NO', lat: 59.9139, lon: 10.7522 },
  { name: 'New York', country: 'US', state: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'San Francisco', country: 'US', state: 'California', lat: 37.7749, lon: -122.4194 },
  { name: 'Chicago', country: 'US', state: 'Illinois', lat: 41.8781, lon: -87.6298 },
  { name: 'Toronto', country: 'CA', state: 'Ontario', lat: 43.6532, lon: -79.3832 },
  { name: 'Mexico City', country: 'MX', lat: 19.4326, lon: -99.1332 },
  { name: 'São Paulo', country: 'BR', lat: -23.5558, lon: -46.6396 },
  { name: 'Lagos', country: 'NG', lat: 6.5244, lon: 3.3792 },
  { name: 'Nairobi', country: 'KE', lat: -1.2864, lon: 36.8172 },
  { name: 'Cape Town', country: 'ZA', lat: -33.9249, lon: 18.4241 },
  { name: 'Mumbai', country: 'IN', lat: 19.076, lon: 72.8777 },
  { name: 'Singapore', country: 'SG', lat: 1.3521, lon: 103.8198 },
  { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
  { name: 'Sydney', country: 'AU', lat: -33.8688, lon: 151.2093 },
];

/** City the server renders on first paint when the URL carries no `?city=`. */
export const DEFAULT_CITY = RECENT_SEARCHES[0];
