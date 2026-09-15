'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  City,
  WeatherViewState,
  Failure,
  WeatherSnapshot,
  ApiEnvelope,
} from '@/lib/types';
import { CurrentWeatherCard } from './current-weather-card';
import { EmptyState } from './empty-state';
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

const GEOLOCATION_TIMEOUT_MS = 10_000;
const GEOLOCATION_MAX_AGE_MS = 5 * 60 * 1000;

const UNAVAILABLE =
  'Your location is not available on this device, so search for a city instead.';

function locationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED)
    return 'Location access is blocked, so search for a city instead.';
  if (error.code === error.TIMEOUT)
    return 'Finding your location took too long — search for a city instead.';
  return UNAVAILABLE;
}

type LocationResult =
  | { ok: true; position: GeolocationPosition }
  | { ok: false; message: string };

/**
 * Wrapped in a promise so the result is always delivered asynchronously. That
 * keeps the state updates out of the effect body, where React would flag them
 * as cascading renders.
 */
function getPosition(): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, message: UNAVAILABLE });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, position }),
      (error) => resolve({ ok: false, message: locationMessage(error) }),
      {
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      },
    );
  });
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

export function WeatherView({ initialRecents }: { initialRecents: City[] }) {
  const [view, setView] = useState<WeatherViewState>({ kind: 'locating' });
  const [recents, setRecents] = useState<City[]>(initialRecents);
  const [query, setQuery] = useState('');
  const [locationNote, setLocationNote] = useState<string | null>(null);

  // Only the newest request may write to state; earlier ones are ignored.
  const requestId = useRef(0);
  // What a retry should re-issue — the last request was not necessarily a city.
  const lastUrl = useRef('');

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

    return snapshot.city.name;
  }, []);

  const search = useCallback(
    (nextQuery: string) => {
      void load(`/api/weather?city=${encodeURIComponent(nextQuery)}`, nextQuery);
    },
    [load],
  );

  useEffect(() => {
    let cancelled = false;

    void getPosition().then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setLocationNote(result.message);
        setView({ kind: 'empty' });
        return;
      }

      const { latitude, longitude } = result.position.coords;
      void load(`/api/weather?lat=${latitude}&lon=${longitude}`, 'your location');
    });

    return () => {
      cancelled = true;
    };
  }, [load]);

  return (
    <>
      <SearchBar
        recents={recents}
        initialQuery=""
        pending={view.kind === 'loading'}
        onSearch={search}
      />

      <div className="mt-6">
        {(view.kind === 'locating' || view.kind === 'loading') && (
          <>
            <p className="sr-only" role="status">
              {view.kind === 'locating'
                ? 'Finding your location'
                : `Loading weather for ${query}`}
            </p>
            {view.kind === 'locating' && (
              <p className="mb-3 text-center text-sm text-muted-foreground">
                Finding your location…
              </p>
            )}
            <WeatherSkeleton />
          </>
        )}

        {view.kind === 'empty' && <EmptyState note={locationNote} />}

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
