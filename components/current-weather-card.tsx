import type { City, CurrentWeather } from '@/lib/types';
import { WeatherIcon } from './weather-icon';
import { capitalize, cityLabel, formatObservedAt } from '../lib/utils';

type Props = {
  city: City;
  current: CurrentWeather;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function CurrentWeatherCard({ city, current }: Props) {
  return (
    <section
      aria-label={`Current weather in ${city.name}`}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {cityLabel(city)}
        </h2>
        <p className="text-xs text-muted-foreground">
          Updated{' '}
          <time dateTime={current.observedAt}>
            {formatObservedAt(current.observedAt)}
          </time>
        </p>
      </div>

      <div className="mt-4 flex items-center gap-4 sm:gap-6">
        <WeatherIcon
          code={current.iconCode}
          description={current.description}
          className="size-20 shrink-0 sm:size-24"
        />
        <div className="min-w-0">
          <p className="text-5xl font-semibold leading-none tabular-nums sm:text-6xl">
            {current.tempC}
            <span className="align-top text-3xl sm:text-4xl">°C</span>
          </p>
          <p className="mt-2 truncate text-base text-muted-foreground sm:text-lg">
            {capitalize(current.description)}
          </p>
          <p className="text-sm text-muted-foreground">
            Feels like {current.feelsLikeC}°C
          </p>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Humidity" value={`${current.humidity}%`} />
        <Metric label="Wind" value={`${current.windSpeedMs} m/s`} />
      </dl>
    </section>
  );
}
