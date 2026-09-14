import { AppError } from '@/lib/response-handler';
import { getCity, getWeatherForCity } from '@/lib/weather/service';
import { DEFAULT_CITY } from '@/components/fixtures';
import { WeatherView } from '@/components/weather-view';
import { WeatherInitialState } from '@/lib/types';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * First paint is rendered on the server so the page arrives with weather
 * already on it. Every search after that is a client-side call to
 * `/api/weather` from `WeatherView`.
 */
async function loadInitial(query: string): Promise<WeatherInitialState> {
  try {
    const city = await getCity(query);
    const snapshot = await getWeatherForCity(city);
    return { kind: 'ready', snapshot };
  } catch (error) {
    const appError = error instanceof AppError ? error : new AppError('INTERNAL');
    if (!(error instanceof AppError)) console.error('Initial render failed:', error);
    return {
      kind: 'error',
      query,
      failure: { message: appError.publicMessage, code: appError.code },
    };
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.city) ? params.city[0] : params.city;
  const query = raw?.trim() || DEFAULT_CITY.name;
  const initial = await loadInitial(query);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Weather
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Current conditions and the next 5 days, for any city.
        </p>
      </header>

      <WeatherView initial={initial} />
    </main>
  );
}
