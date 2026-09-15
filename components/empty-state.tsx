export function EmptyState({ note }: { note?: string | null }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="mx-auto size-10 text-muted-foreground"
        aria-hidden="true"
      >
        <path
          d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <h2 className="mt-4 text-lg font-semibold">Start by searching a city</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {note ??
          'Search above to see current conditions and a 5-day forecast, or allow location access to see your local weather.'}
      </p>
    </section>
  );
}
