'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ApiEnvelope, City } from '@/lib/types';
import { coordKey, cityLabel } from '../lib/utils';

type Props = {
  recents: City[];
  initialQuery: string;
  pending: boolean;
  onSearch: (query: string) => void;
};

type Suggestion = {
  city: City;
  recent: boolean;
};

const MAX_SUGGESTIONS = 7;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

/**
 * Suggestions are a convenience, never a blocker: any failure — route down,
 * upstream error, aborted request — resolves to an empty list, and the dropdown
 * falls back to recent searches alone.
 */
async function fetchSuggestions(
  query: string,
  signal: AbortSignal,
): Promise<City[]> {
  try {
    const response = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`, {
      signal,
    });
    const envelope = (await response.json()) as ApiEnvelope<City[]>;
    if (envelope?.errorObject || !Array.isArray(envelope?.data)) return [];
    return envelope.data;
  } catch {
    return [];
  }
}

/** Recents first, then whatever the API returned, deduped by rounded coordinates. */
function merge(query: string, recents: City[], remote: City[]): Suggestion[] {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: Suggestion[] = [];

  const push = (city: City, recent: boolean) => {
    const key = coordKey(city.lat, city.lon);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ city, recent });
  };

  for (const city of recents) {
    if (!needle || city.name.toLowerCase().includes(needle)) push(city, true);
  }
  for (const city of remote) push(city, false);

  return out.slice(0, MAX_SUGGESTIONS);
}

export function SearchBar({ recents, initialQuery, pending, onSearch }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [remote, setRemote] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  // The input is seeded with the city already on screen. Until the user edits
  // it, that text is not a query: it neither filters the recent-search list nor
  // earns a suggest request.
  const [edited, setEdited] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => merge(edited ? value : '', recents, remote),
    [edited, value, recents, remote],
  );

  // Debounced lookup. `loading` is raised in the change handler instead, so the
  // dropdown reacts while the debounce window is still open.
  useEffect(() => {
    const query = value.trim();
    if (!edited || query.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const cities = await fetchSuggestions(query, controller.signal);
      if (controller.signal.aborted) return;
      setRemote(cities);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, edited]);

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setEdited(true);
    setValue(next);
    setActive(-1);
    setOpen(true);
    if (next.trim().length < MIN_QUERY_LENGTH) {
      setRemote([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function submit(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    // Submitting rewrites the input with the chosen name; don't let that echo
    // back as another suggest lookup.
    setEdited(false);
    setValue(trimmed);
    setOpen(false);
    setActive(-1);
    setRemote([]);
    setLoading(false);
    inputRef.current?.blur();
    onSearch(trimmed);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      submit(suggestions[active].city.name);
    }
  }

  const searching = loading && suggestions.length === 0;
  const expanded = open && (suggestions.length > 0 || searching);

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <label htmlFor="city-search" className="sr-only">
        Search for a city
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          >
            <path
              d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            id="city-search"
            ref={inputRef}
            type="text"
            value={value}
            autoComplete="off"
            placeholder="Search a city…"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              active >= 0 ? `${listId}-option-${active}` : undefined
            }
            onChange={onChange}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:px-6"
        >
          {pending ? 'Searching…' : 'Search'}
        </button>
      </div>

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="City suggestions"
          aria-busy={loading}
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {searching && (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">
              Searching…
            </li>
          )}
          {suggestions.map((suggestion, index) => (
            <li
              key={coordKey(suggestion.city.lat, suggestion.city.lon)}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === active}
              // Keep focus on the input so onBlur doesn't close the list first.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => submit(suggestion.city.name)}
              onMouseEnter={() => setActive(index)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                index === active ? 'bg-muted' : ''
              }`}
            >
              <span className="truncate">{cityLabel(suggestion.city)}</span>
              {suggestion.recent && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  Recent
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
