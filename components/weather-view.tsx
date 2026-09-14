'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  City,
  WeatherViewState,
  Failure,
  WeatherInitialState,
  WeatherSnapshot,
  ApiEnvelope,
} from '@/lib/types';
import { CurrentWeatherCard } from './current-weather-card';
import { ErrorState } from './error-state';
import { ForecastList } from './forecast-list';
import { SearchBar } from './search-bar';
import { WeatherSkeleton } from './skeletons';
import { coordKey } from '../lib/utils';

const GENERIC: Failure = {
  message: 'Something went wrong on our end.',
  code: 'INTERNAL',
};

const MAX_RECENT = 5;

const GEOLOCATION_ASKED_KEY = 'weather:geolocation-asked';
const GEOLOCATION_TIMEOUT_MS = 10_000;

function hasAskedForLocation(): boolean {
  try {
    return localStorage.getItem(GEOLOCATION_ASKED_KEY) !== null;
  } catch {
    return true;
  }
}

function rememberLocationAsked(): void {
  try {
    localStorage.setItem(GEOLOCATION_ASKED_KEY, '1');
  } catch {
    return;
  }
}


async function persistRecent(city: City): Promise<City[] | null> {
  try {
    const posted = await fetch('/api/searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm: city }),
    });
    const ack = (await posted.json()) as ApiEnvelope<null>;
    if (ack?.errorObject) return null;

    const response = await fetch('/api/searches');
    const envelope = (await response.json()) as ApiEnvelope<City[]>;
    if (envelope?.errorObject || !Array.isArray(envelope?.data)) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

function initialView(initial: WeatherInitialState): WeatherViewState {
  return initial.kind === 'ready'
    ? { kind: 'ready', snapshot: initial.snapshot }
    : { kind: 'error', failure: initial.failure };
}

function initialQuery(initial: WeatherInitialState): string {
  return initial.kind === 'ready' ? initial.snapshot.city.name : initial.query;
}

export function WeatherView({
  initial,
  initialRecents,
}: {
  initial: WeatherInitialState;
  initialRecents: City[];
}) {
  const [view, setView] = useState<WeatherViewState>(() =>
    initialView(initial),
  );
  const [recents, setRecents] = useState<City[]>(initialRecents);
  const [query, setQuery] = useState(() => initialQuery(initial));

  // Only the newest request may write to state; earlier ones are ignored.
  const requestId = useRef(0);
  // What a retry should re-issue — the last request was not necessarily a city.
  // Seeded with the server-rendered query so retrying a failed first paint works.
  const lastUrl = useRef(
    `/api/weather?city=${encodeURIComponent(initialQuery(initial))}`,
  );

  const load = useCallback(async (url: string, label: string) => {
    const id = ++requestId.current;
    lastUrl.current = url;
    setQuery(label);
    setView({ kind: 'loading' });

    let envelope: ApiEnvelope<WeatherSnapshot>;
    try {
      const response = await fetch(url);
      envelope = (await response.json()) as ApiEnvelope<WeatherSnapshot>;
    } catch {
      if (id === requestId.current) {
        setView({
          kind: 'error',
          failure: {
            message: 'Could not reach the server. Check your connection.',
            code: 'UPSTREAM_UNAVAILABLE',
          },
        });
      }
      return;
    }

    if (id !== requestId.current) return;

    if (envelope?.errorObject) {
      setView({
        kind: 'error',
        failure: {
          message: envelope.errorObject.error,
          code: envelope.errorObject.code,
        },
      });
      return;
    }
    if (!envelope?.data) {
      setView({ kind: 'error', failure: GENERIC });
      return;
    }

    const snapshot = envelope.data;
    setView({ kind: 'ready', snapshot });

    // Show it in the list immediately, then reconcile with the store.
    setRecents((current) => withRecent(current, snapshot.city));
    const stored = await persistRecent(snapshot.city);
    if (stored && id === requestId.current) setRecents(stored);
  }, []);

  const search = useCallback(
    (nextQuery: string) => {
      void load(
        `/api/weather?city=${encodeURIComponent(nextQuery)}`,
        nextQuery,
      );
    },
    [load],
  );
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    if (hasAskedForLocation()) return;

    rememberLocationAsked();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void load(
          `/api/weather?lat=${latitude}&lon=${longitude}`,
          'your location',
        );
      },
      () => undefined,
      { timeout: GEOLOCATION_TIMEOUT_MS },
    );
  }, [load]);

  return (
    <>
      <SearchBar
        recents={recents}
        initialQuery={initialQuery(initial)}
        pending={view.kind === 'loading'}
        onSearch={search}
      />

      <div className="mt-6">
        {view.kind === 'loading' && (
          <>
            <p className="sr-only" role="status">
              Loading weather for {query}
            </p>
            <WeatherSkeleton />
          </>
        )}

        {view.kind === 'error' && (
          <ErrorState
            message={view.failure.message}
            code={view.failure.code}
            onRetry={() => void load(lastUrl.current, query)}
            retrying={false}
          />
        )}

        {view.kind === 'ready' && (
          <>
            <CurrentWeatherCard
              city={view.snapshot.city}
              current={view.snapshot.current}
            />
            <ForecastList days={view.snapshot.forecast} />
          </>
        )}
      </div>
    </>
  );
}

/** Optimistic local version of what the store does on `add`. */
function withRecent(current: City[], city: City): City[] {
  const key = coordKey(city.lat, city.lon);
  return [
    city,
    ...current.filter((entry) => coordKey(entry.lat, entry.lon) !== key),
  ].slice(0, MAX_RECENT);
}
