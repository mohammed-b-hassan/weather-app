import type { ErrorCode } from '@/lib/types';

type Props = {
  message: string;
  code: ErrorCode;
  onRetry: () => void;
  retrying: boolean;
};

const RETRYABLE: ErrorCode[] = [
  'UPSTREAM_UNAVAILABLE',
  'UPSTREAM_RATE_LIMITED',
  'UPSTREAM_TIMEOUT',
  'INTERNAL',
];

export function ErrorState({ message, code, onRetry, retrying }: Props) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-danger/30 bg-danger-surface p-6 text-center"
    >
      <svg viewBox="0 0 24 24" className="mx-auto size-9 text-danger" aria-hidden="true">
        <path
          d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-3 text-base font-medium text-danger">{message}</p>
      {code === 'CITY_NOT_FOUND' && (
        <p className="mt-1 text-sm text-muted-foreground">
          Try a nearby larger city, or pick one from the suggestions.
        </p>
      )}
      {RETRYABLE.includes(code) && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </section>
  );
}
