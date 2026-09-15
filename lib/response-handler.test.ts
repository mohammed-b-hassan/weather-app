import { afterAll, afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  AppError,
  fromUpstreamStatus,
  toErrorResponse,
  toSuccessResponse,
} from './response-handler';

const serverLog = spyOn(console, 'log').mockImplementation(() => {});
const serverError = spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  serverLog.mockClear();
  serverError.mockClear();
});

afterAll(() => {
  serverLog.mockRestore();
  serverError.mockRestore();
});

describe('AppError', () => {
  test('carries the http status mapped to its code', () => {
    expect(new AppError('INVALID_INPUT').status).toBe(400);
    expect(new AppError('CITY_NOT_FOUND').status).toBe(404);
    expect(new AppError('UPSTREAM_TIMEOUT').status).toBe(504);
  });

  test('keeps the internal message separate from the public one', () => {
    const error = new AppError('INTERNAL', 'OPENWEATHER_API_KEY is not set');

    expect(error.message).toBe('OPENWEATHER_API_KEY is not set');
    expect(error.publicMessage).toBe('Something went wrong on our end.');
  });

  test('falls back to the code when no internal message is given', () => {
    expect(new AppError('INVALID_INPUT').message).toBe('INVALID_INPUT');
  });
});

describe('fromUpstreamStatus', () => {
  test('maps 404 to a missing city', () => {
    expect(fromUpstreamStatus(404).code).toBe('CITY_NOT_FOUND');
  });

  test('maps 429 to rate limiting', () => {
    const error = fromUpstreamStatus(429);

    expect(error.code).toBe('UPSTREAM_RATE_LIMITED');
    expect(error.status).toBe(429);
  });

  test('treats rejected credentials as our failure, not the callers', () => {
    expect(fromUpstreamStatus(401).code).toBe('UPSTREAM_UNAVAILABLE');
    expect(fromUpstreamStatus(403).code).toBe('UPSTREAM_UNAVAILABLE');
    expect(fromUpstreamStatus(401).status).toBe(502);
  });

  test('records the upstream status in the internal message only', () => {
    const error = fromUpstreamStatus(503);

    expect(error.message).toContain('503');
    expect(error.publicMessage).not.toContain('503');
  });

  test('maps any other upstream failure to unavailable', () => {
    expect(fromUpstreamStatus(500).code).toBe('UPSTREAM_UNAVAILABLE');
    expect(fromUpstreamStatus(418).code).toBe('UPSTREAM_UNAVAILABLE');
  });
});

describe('toSuccessResponse', () => {
  test('wraps data in a 200 envelope carrying no error', () => {
    expect(toSuccessResponse({ tempC: 19 })).toEqual({
      status: 200,
      errorObject: null,
      data: { tempC: 19 },
    });
  });
});

describe('toErrorResponse', () => {
  test('uses the status and public message of an AppError', () => {
    expect(toErrorResponse(new AppError('CITY_NOT_FOUND'))).toEqual({
      status: 404,
      errorObject: {
        error: "We couldn't find that city. Check the spelling and try again.",
        code: 'CITY_NOT_FOUND',
      },
      data: null,
    });
  });

  test('never leaks the internal message of an AppError', () => {
    const response = toErrorResponse(
      new AppError(
        'UPSTREAM_UNAVAILABLE',
        'https://api.example.com?appid=secret',
      ),
    );

    expect(response.errorObject?.error).toBe(
      'The weather service is unavailable right now.',
    );
  });

  test('converts an unrecognised throw into a 500 without exposing it', () => {
    const response = toErrorResponse(
      new Error('connect ECONNREFUSED 127.0.0.1:5432'),
    );

    expect(response.status).toBe(500);
    expect(response.errorObject).toEqual({
      error: 'Something went wrong on our end.',
      code: 'INTERNAL',
    });
    expect(response.data).toBeNull();
  });

  test('handles a thrown value that is not an Error', () => {
    expect(toErrorResponse('boom').status).toBe(500);
  });
});
