import { getRecentSearch } from '@/lib/weather/service';
import { ThemeToggle } from '@/components/theme-toggle';
import { readTheme } from '@/lib/theme';
import { WeatherView } from '@/components/weather-view';
import { City } from '@/lib/types';

/** Recent searches are a nicety — a store failure must not take the page down. */
async function loadRecents(): Promise<City[]> {
  try {
    return await getRecentSearch();
  } catch (error) {
    console.error('Reading recent searches failed:', error);
    return [];
  }
}

export default async function Home() {
  const theme = await readTheme();
  const recents = await loadRecents();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Weather
          </h1>
          <ThemeToggle initial={theme} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Current conditions and the next 5 days, for any city.
        </p>
      </header>

      <WeatherView initialRecents={recents} />
    </main>
  );
}
