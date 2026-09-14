import { z } from 'zod';
import { parseOrThrow } from './utils';
import { AppError } from './response-handler';
import type { City } from './types';
import type { NextRequest } from 'next/server';

const MAX_NAME_LENGTH = 200;
const MAX_QUERY_LENGTH = 100;

export const citySchema: z.ZodType<City> = z.object({
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  country: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  state: z.string().trim().min(1).max(MAX_NAME_LENGTH).optional(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

function coordinate(bound: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform(Number)
    .pipe(z.number().min(-bound).max(bound));
}

export const weatherQuerySchema = z.union([
  z.object({ city: z.string().trim().min(1).max(MAX_QUERY_LENGTH) }),
  z.object({ lat: coordinate(90), lon: coordinate(180) }),
]);

export const suggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
});

export const recordSearchSchema = z.object({
  searchTerm: citySchema,
});

export function parseRequest<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseOrThrow(schema, value, 'INVALID_INPUT');
}

export function parseQuery<T>(schema: z.ZodType<T>, request: NextRequest): T {
  return parseRequest(schema, Object.fromEntries(request.nextUrl.searchParams));
}

export async function parseBody<T>(
  schema: z.ZodType<T>,
  request: NextRequest,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError('INVALID_INPUT', 'request body is not valid JSON');
  }
  return parseRequest(schema, body);
}
