import type { ForecastDay } from '@/lib/types';
import { WeatherIcon } from './weather-icon';
import { capitalize, formatDayMonth, formatWeekday } from '../lib/format';

type Props = {
  days: ForecastDay[];
};

/** Each day's range drawn against the span of the whole forecast. */
function RangeBar({ day, low, span }: { day: ForecastDay; low: number; span: number }) {
  const offset = ((day.minC - low) / span) * 100;
  const width = Math.max(((day.maxC - day.minC) / span) * 100, 8);
  return (
    <div
      className="mt-3 h-1.5 w-full rounded-full bg-muted"
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-rain to-sun"
        style={{ marginInlineStart: `${offset}%`, width: `${width}%` }}
      />
    </div>
  );
}

export function ForecastList({ days }: Props) {
  if (days.length === 0) return null;

  const low = Math.min(...days.map((day) => day.minC));
  const high = Math.max(...days.map((day) => day.maxC));
  const span = Math.max(high - low, 1);

  return (
    <section aria-label="5-day forecast" className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        5-day forecast
      </h2>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
        {days.map((day) => (
          <li
            key={day.date}
            className="w-36 shrink-0 snap-start rounded-2xl border border-border bg-card p-4 text-center shadow-sm sm:w-auto"
          >
            <p className="text-sm font-semibold">{formatWeekday(day.date)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDayMonth(day.date)}
            </p>
            <WeatherIcon
              code={day.iconCode}
              description={day.description}
              className="mx-auto my-2 size-14"
            />
            <p className="text-xs text-muted-foreground" title={capitalize(day.description)}>
              <span className="line-clamp-1">{capitalize(day.description)}</span>
            </p>
            <p className="mt-2 tabular-nums">
              <span className="text-lg font-semibold">{day.maxC}°</span>
              <span className="ml-2 text-sm text-muted-foreground">
                {day.minC}°
              </span>
            </p>
            <RangeBar day={day} low={low} span={span} />
            {day.isPartialDay && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Partial day
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
