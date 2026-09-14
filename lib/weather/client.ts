import { AppError, fromUpstreamStatus } from '@/lib/response-handler';
import { parseOrThrow } from '@/lib/utils';
import { owmCurrentSchema, owmForecastSchema, owmCitiesSchema } from './schema';
import type { City } from '@/lib/types';
import type { z } from 'zod';

const TIMEOUT_MS = 8_000;

function apiKey(): string {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new AppError('INTERNAL', 'OPENWEATHER_API_KEY is not set');
  return key;
}
function baseUrl(): string {
  const url = process.env.OPENWEATHER_API_BASE_URL;
  if (!url)
    throw new AppError('INTERNAL', 'OPENWEATHER_API_BASE_URL is not set');
  return url;
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

function parseUpstream<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseOrThrow(schema, value, 'UPSTREAM_UNAVAILABLE');
}

export async function searchCities(query: string, limit = 5): Promise<City[]> {
  const url = `${baseUrl()}/geo/2.5/direct?q=${encodeURIComponent(query)}&limit=${limit}&appid=${apiKey()}`;
  return parseUpstream(owmCitiesSchema, await getJson(url));
}

export async function fetchCurrent(lat: number, lon: number) {
  const url = `${baseUrl()}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey()}`;
  return parseUpstream(owmCurrentSchema, await getJson(url));
}

export async function fetchForecast(lat: number, lon: number) {
  const url = `${baseUrl()}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey()}`;
  return parseUpstream(owmForecastSchema, await getJson(url));
}
