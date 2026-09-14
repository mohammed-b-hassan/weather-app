import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { parseOrThrow } from './utils';
import { AppError } from './response-handler';

const schema = z.object({ city: z.string().min(1) });

describe('parseOrThrow', () => {
  test('returns the parsed value when it is valid', () => {
    expect(parseOrThrow(schema, { city: 'London' }, 'INVALID_INPUT')).toEqual({
      city: 'London',
    });
  });

  test('throws an AppError carrying the code it was given', () => {
    expect(() => parseOrThrow(schema, {}, 'INVALID_INPUT')).toThrow(AppError);

    try {
      parseOrThrow(schema, {}, 'INVALID_INPUT');
    } catch (error) {
      expect((error as AppError).code).toBe('INVALID_INPUT');
      expect((error as AppError).status).toBe(400);
    }
  });

  test('assigns blame through the code, not the schema', () => {
    try {
      parseOrThrow(schema, {}, 'UPSTREAM_UNAVAILABLE');
    } catch (error) {
      expect((error as AppError).code).toBe('UPSTREAM_UNAVAILABLE');
      expect((error as AppError).status).toBe(502);
    }
  });

  test('keeps the zod detail in the internal message only', () => {
    try {
      parseOrThrow(schema, {}, 'INVALID_INPUT');
    } catch (error) {
      expect((error as AppError).message).toContain('city');
      expect((error as AppError).publicMessage).toBe(
        'Please enter a city name.',
      );
    }
  });
});
