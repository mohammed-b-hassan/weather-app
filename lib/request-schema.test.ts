import { describe, expect, test } from 'bun:test';
import { NextRequest } from 'next/server';
import {
  citySchema,
  parseBody,
  parseQuery,
  parseRequest,
  recordSearchSchema,
  suggestQuerySchema,
  weatherQuerySchema,
} from './request-schema';
import { AppError } from './response-handler';

function get(url: string): NextRequest {
  return new NextRequest(url);
}

function post(body: string): NextRequest {
  return new NextRequest('http://localhost/api/searches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

const paris = {
  name: 'Paris',
  country: 'FR',
  lat: 48.8566,
  lon: 2.3522,
};

describe('citySchema', () => {
  test('accepts a city with and without a state', () => {
    expect(citySchema.parse(paris)).toEqual(paris);
    expect(citySchema.parse({ ...paris, state: 'Ile-de-France' }).state).toBe(
      'Ile-de-France',
    );
  });

  test('rejects coordinates outside the valid range', () => {
    expect(citySchema.safeParse({ ...paris, lat: 91 }).success).toBe(false);
    expect(citySchema.safeParse({ ...paris, lon: -181 }).success).toBe(false);
  });

  test('rejects coordinates that are not real numbers', () => {
    expect(citySchema.safeParse({ ...paris, lat: NaN }).success).toBe(false);
    expect(citySchema.safeParse({ ...paris, lat: '48.8566' }).success).toBe(
      false,
    );
  });

  test('rejects an empty or missing name', () => {
    expect(citySchema.safeParse({ ...paris, name: '   ' }).success).toBe(false);
    expect(citySchema.safeParse({ ...paris, name: undefined }).success).toBe(
      false,
    );
  });
});

describe('parseRequest', () => {
  test('returns the parsed value when it is valid', () => {
    expect(parseRequest(weatherQuerySchema, { city: 'London' })).toEqual({
      city: 'London',
    });
  });

  test('blames the caller with INVALID_INPUT and a 400 status', () => {
    expect(() => parseRequest(weatherQuerySchema, {})).toThrow(AppError);

    try {
      parseRequest(weatherQuerySchema, {});
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_INPUT');
      expect((error as AppError).status).toBe(400);
    }
  });
});

describe('parseQuery', () => {
  test('reads and trims a query parameter', () => {
    expect(
      parseQuery(weatherQuerySchema, get('http://localhost/api?city=%20London%20')),
    ).toEqual({ city: 'London' });
  });

  test('rejects a missing parameter', () => {
    expect(() => parseQuery(weatherQuerySchema, get('http://localhost/api'))).toThrow(
      AppError,
    );
  });

  test('rejects a blank parameter', () => {
    expect(() =>
      parseQuery(weatherQuerySchema, get('http://localhost/api?city=%20%20')),
    ).toThrow(AppError);
  });

  test('rejects an overlong parameter', () => {
    expect(() =>
      parseQuery(
        suggestQuerySchema,
        get(`http://localhost/api?q=${'a'.repeat(101)}`),
      ),
    ).toThrow(AppError);
  });

  test('reads the suggest parameter under its own name', () => {
    expect(
      parseQuery(suggestQuerySchema, get('http://localhost/api?q=lon')),
    ).toEqual({ q: 'lon' });
  });
});

describe('parseBody', () => {
  test('accepts a well formed city payload', async () => {
    const parsed = await parseBody(
      recordSearchSchema,
      post(JSON.stringify({ searchTerm: paris })),
    );

    expect(parsed.searchTerm).toEqual(paris);
  });

  test('rejects a searchTerm that is a bare string', async () => {
    expect(
      parseBody(recordSearchSchema, post(JSON.stringify({ searchTerm: 'paris' }))),
    ).rejects.toThrow(AppError);
  });

  test('rejects a payload missing searchTerm', async () => {
    expect(parseBody(recordSearchSchema, post('{}'))).rejects.toThrow(AppError);
  });

  test('rejects a body that is not json', async () => {
    expect(parseBody(recordSearchSchema, post('not json'))).rejects.toThrow(
      AppError,
    );
  });

  test('reports a malformed body as INVALID_INPUT rather than a crash', async () => {
    try {
      await parseBody(recordSearchSchema, post('not json'));
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_INPUT');
      expect((error as AppError).status).toBe(400);
    }
  });
});
