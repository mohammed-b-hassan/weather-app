function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

/** Mirrors the real layout so nothing jumps when the data lands. */
export function WeatherSkeleton() {
  return (
    <div aria-hidden="true">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Block className="h-7 w-44" />
          <Block className="h-4 w-24" />
        </div>
        <div className="mt-4 flex items-center gap-4 sm:gap-6">
          <Block className="size-20 shrink-0 rounded-full sm:size-24" />
          <div className="flex-1 space-y-2">
            <Block className="h-12 w-32" />
            <Block className="h-5 w-40" />
            <Block className="h-4 w-28" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Block className="h-[74px]" />
          <Block className="h-[74px]" />
        </div>
      </section>

      <div className="mt-6">
        <Block className="mb-3 h-4 w-32" />
        <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} className="w-36 shrink-0 sm:w-auto">
              <Block className="h-[206px] w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
