'use client';

import { useCallback, useRef, useState } from 'react';
import type { City, WeatherViewState , Failure, WeatherInitialState, WeatherSnapshot, ApiEnvelope } from '@/lib/types';
import { CurrentWeatherCard } from './current-weather-card';
import { ErrorState } from './error-state';
import { ForecastList } from './forecast-list';
import { RECENT_SEARCHES } from './fixtures';
import { SearchBar } from './search-bar';
import { WeatherSkeleton } from './skeletons';
import { cityKey } from './format';

const GENERIC: Failure = {
  message: 'Something went wrong on our end.',
  code: 'INTERNAL',
};

function initialView(initial: WeatherInitialState): WeatherViewState {
  return initial.kind === 'ready'
    ? { kind: 'ready', snapshot: initial.snapshot }
    : { kind: 'error', failure: initial.failure };
}

function initialQuery(initial: WeatherInitialState): string {
  return initial.kind === 'ready' ? initial.snapshot.city.name : initial.query;
}

export function WeatherView({ initial }: { initial: WeatherInitialState }) {
  const [view, setView] = useState<WeatherViewState>(() => initialView(initial));
  const [recents, setRecents] = useState<City[]>(() => {
    if (initial.kind !== 'ready') return RECENT_SEARCHES;
    return withRecent(RECENT_SEARCHES, initial.snapshot.city);
  });
  const [query, setQuery] = useState(() => initialQuery(initial));

  // Only the newest request may write to state; earlier ones are ignored.
  const requestId = useRef(0);

  const search = useCallback(async (nextQuery: string) => {
    const id = ++requestId.current;
    setQuery(nextQuery);
    setView({ kind: 'loading' });

    let envelope: ApiEnvelope<WeatherSnapshot>;
    try {
      const response = await fetch(
        `/api/weather?city=${encodeURIComponent(nextQuery)}`,
      );
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

    setView({ kind: 'ready', snapshot: envelope.data });
    setRecents((current) => withRecent(current, envelope.data!.city));
  }, []);

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
            onRetry={() => search(query)}
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

/**
 * TODO: persist through `POST /api/searches` once the route exists — this list
 * currently lives only for the lifetime of the page.
 */
function withRecent(current: City[], city: City): City[] {
  const key = cityKey(city);
  return [city, ...current.filter((entry) => cityKey(entry) !== key)].slice(0, 8);
}
