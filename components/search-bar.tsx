'use client';

import { useId, useMemo, useRef, useState } from 'react';
import type { City } from '@/lib/types';
import { SUGGESTION_POOL } from './fixtures';
import { cityKey, cityLabel } from './format';

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

/**
 * TODO: replace `match()` with a debounced `GET /api/suggest?q=` once the route
 * exists. The dropdown already treats remote results as optional — recents are
 * rendered first and stand alone if nothing else matches.
 */
function match(query: string, recents: City[]): Suggestion[] {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: Suggestion[] = [];

  const push = (city: City, recent: boolean) => {
    const key = cityKey(city);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ city, recent });
  };

  for (const city of recents) {
    if (!needle || city.name.toLowerCase().includes(needle)) push(city, true);
  }
  if (needle) {
    for (const city of SUGGESTION_POOL) {
      if (city.name.toLowerCase().startsWith(needle)) push(city, false);
    }
    for (const city of SUGGESTION_POOL) {
      if (city.name.toLowerCase().includes(needle)) push(city, false);
    }
  }
  return out.slice(0, MAX_SUGGESTIONS);
}

export function SearchBar({ recents, initialQuery, pending, onSearch }: Props) {
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => match(value, recents), [value, recents]);

  function submit(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    setValue(trimmed);
    setOpen(false);
    setActive(-1);
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
      setActive((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1,
      );
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault();
      submit(suggestions[active].city.name);
    }
  }

  const expanded = open && suggestions.length > 0;

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
            name="city"
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
            onChange={(event) => {
              setValue(event.target.value);
              setActive(-1);
              setOpen(true);
            }}
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
          className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={cityKey(suggestion.city)}
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
