import { ErrorCode, ErrorObject } from './types';

const STATUS: Record<ErrorCode, number> = {
  CITY_NOT_FOUND: 404,
  INVALID_INPUT: 400,
  UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_RATE_LIMITED: 429,
  UPSTREAM_TIMEOUT: 504,
  INTERNAL: 500,
  INVALID_METHOD: 405,
};

const MESSAGE: Record<ErrorCode, string> = {
  CITY_NOT_FOUND:
    "We couldn't find that city. Check the spelling and try again.",
  INVALID_INPUT: 'Please enter a city name.',
  UPSTREAM_UNAVAILABLE: 'The weather service is unavailable right now.',
  UPSTREAM_RATE_LIMITED:
    'Too many requests. Please wait a moment and try again.',
  UPSTREAM_TIMEOUT: 'The weather service took too long to respond.',
  INTERNAL: 'Something went wrong on our end.',
  INVALID_METHOD: 'HTTP method not allowed.',
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly publicMessage: string;

  constructor(code: ErrorCode, internalMessage?: string) {
    super(internalMessage ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.publicMessage = MESSAGE[code];
  }
}
export function fromUpstreamStatus(status: number): AppError {
  if (status === 404) return new AppError('CITY_NOT_FOUND');
  if (status === 401 || status === 403)
    return new AppError(
      'UPSTREAM_UNAVAILABLE',
      `upstream auth failure (${status})`,
    );
  if (status === 429) return new AppError('UPSTREAM_RATE_LIMITED');
  return new AppError('UPSTREAM_UNAVAILABLE', `upstream returned ${status}`);
}
function formatResponse<T>(
  status: number,
  error: AppError | null,
  data: T | null,
) {
  const errorObject = error
    ? { error: error.publicMessage, code: error.code }
    : null;
  return {
    status: status,
    errorObject: errorObject,
    data: data,
  };
}
export function toSuccessResponse<T>(data: T): {
  status: number;
  errorObject: ErrorObject;
  data: T | null;
} {
  return formatResponse<T>(200, null, data);
}
export function toErrorResponse(err: unknown): {
  status: number;
  errorObject: ErrorObject;
  data: null;
} {
  const appErr = err instanceof AppError ? err : new AppError('INTERNAL');
  if (!(err instanceof AppError)) console.error('Unhandled error:', err);
  // server log
  console.log(`ERROR(${appErr.code}):`, appErr.message);
  return formatResponse(appErr.status, appErr, null);
}
