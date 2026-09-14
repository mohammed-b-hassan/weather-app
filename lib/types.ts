export type Theme = 'light' | 'dark';

export interface City {
  name: string;
  country: string;
  state?: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  windSpeedMs: number;
  description: string;
  iconCode: string;
  observedAt: string;
}

export interface ForecastDay {
  date: string;
  minC: number;
  maxC: number;
  description: string;
  iconCode: string;
  isPartialDay: boolean;
}

export interface WeatherSnapshot {
  city: City;
  current: CurrentWeather;
  forecast: ForecastDay[];
  cached: boolean;
}
export type ApiEnvelope<T> = {
  status: number;
  errorObject: ErrorObject;
  data: T | null;
};

export type Failure = { message: string; code: ErrorCode };

export type WeatherInitialState =
  | { kind: 'ready'; snapshot: WeatherSnapshot }
  | { kind: 'error'; query: string; failure: Failure };

export type WeatherViewState =
  | { kind: 'ready'; snapshot: WeatherSnapshot }
  | { kind: 'loading' }
  | { kind: 'error'; failure: Failure };

export type ErrorCode =
  | 'CITY_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_RATE_LIMITED'
  | 'UPSTREAM_TIMEOUT'
  | 'INTERNAL'
  | 'INVALID_METHOD';
export type ErrorObject = {
  error: string;
  code: ErrorCode;
} | null;
