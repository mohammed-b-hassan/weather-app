import type { City } from '@/lib/types';

/**
 * Everything is formatted in UTC on purpose: the same string has to come out of
 * the server render and the client hydration, and the viewer's timezone is not
 * known on the server.
 */
const weekday = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  timeZone: 'UTC',
});
const dayMonth = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

/** `ForecastDay.date` is a `YYYY-MM-DD` in the city's local calendar. */
export function formatWeekday(date: string): string {
  return weekday.format(new Date(`${date}T00:00:00Z`));
}

export function formatDayMonth(date: string): string {
  return dayMonth.format(new Date(`${date}T00:00:00Z`));
}

export function formatObservedAt(iso: string): string {
  return `${clock.format(new Date(iso))} UTC`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function cityLabel(city: City): string {
  return [city.name, city.state, city.country].filter(Boolean).join(', ');
}

export function cityKey(city: City): string {
  return `${city.lat.toFixed(2)},${city.lon.toFixed(2)}`;
}
