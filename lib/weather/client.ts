import { AppError, fromUpstreamStatus } from '@/lib/response-handler';
import { owmCurrentSchema, owmForecastSchema, owmCitiesSchema } from './schema';
import type { City } from '@/lib/types';

const BASE = 'https://api.openweathermap.org';
const TIMEOUT_MS = 8_000;

function apiKey(): string {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new AppError('INTERNAL', 'OPENWEATHER_API_KEY is not set');
  return key;
}

async function getJson(url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'TimeoutError') {
      throw new AppError('UPSTREAM_TIMEOUT');
    }
    throw new AppError('UPSTREAM_UNAVAILABLE', String(cause));
  }
  if (!response.ok) throw fromUpstreamStatus(response.status);
  return response.json();
}

export async function searchCities(query: string, limit = 5): Promise<City[]> {
  const url = `${BASE}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey()}`;
  const parsed = owmCitiesSchema.safeParse(await getJson(url));
  if (!parsed.success)
    throw new AppError('UPSTREAM_UNAVAILABLE', parsed.error.message);
  return parsed.data;
}

export async function fetchCurrent(lat: number, lon: number) {
  const url = `${BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey()}`;
  const parsed = owmCurrentSchema.safeParse(await getJson(url));
  if (!parsed.success)
    throw new AppError('UPSTREAM_UNAVAILABLE', parsed.error.message);
  return parsed.data;
}

export async function fetchForecast(lat: number, lon: number) {
  const url = `${BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey()}`;
  const parsed = owmForecastSchema.safeParse(await getJson(url));
  if (!parsed.success)
    throw new AppError('UPSTREAM_UNAVAILABLE', parsed.error.message);
  return parsed.data;
}
