import { TtlCache } from '../cache/ttl-cache';
import { cityKey } from '../format';
import { AppError } from '../response-handler';
import { getStore } from '../store/recent-searches';
import { City, WeatherSnapshot } from '../types';
import { fetchCurrent, fetchForecast, searchCities } from './client';
import { toCurrentWeather, toForecastDays } from './normalize';
const TTL_MS = Number(process.env.CACHE_TTL_SECONDS ?? 600) * 1000;

const globalCache = globalThis as typeof globalThis & {
  __weatherCache?: TtlCache<WeatherSnapshot>;
};

const cache: TtlCache<WeatherSnapshot> = (globalCache.__weatherCache ??=
  new TtlCache<WeatherSnapshot>(TTL_MS));

export async function getCity(query: string) {
  const trimmed = query.trim();
  if (!trimmed) throw new AppError('INVALID_INPUT');
  const matches = await searchCities(trimmed, 1);
  const city = matches[0];
  if (!city) throw new AppError('CITY_NOT_FOUND');
  return city;
}
export async function getCities(query: string) {
  const trimmed = query.trim();
  if (!trimmed) throw new AppError('INVALID_INPUT');
  const matches = await searchCities(trimmed);
  const cities = matches;
  if (!cities || !cities[0]) throw new AppError('CITY_NOT_FOUND');
  return cities;
}
export async function getWeatherForCity(city: City): Promise<WeatherSnapshot> {
  const key = cityKey(city);
  const hit = cache.get(key);
  if (hit) return { ...hit, cached: true };
  const [current, forecast] = await Promise.all([
    fetchCurrent(city.lat, city.lon),
    fetchForecast(city.lat, city.lon),
  ]);

  const result: WeatherSnapshot = {
    city,
    current: toCurrentWeather(current),
    forecast: toForecastDays(forecast),
    cached: false,
  };
  cache.set(key, result);
  return result;
}
export async function getRecentSearch(): Promise<City[]> {
  const store = await getStore();
  return await store.list();
}
export async function recordSearch(city: City): Promise<void> {
  const store = await getStore();
  await store.add(city);
}
