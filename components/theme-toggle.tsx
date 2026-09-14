'use client';

import { useState } from 'react';
import type { Theme } from '@/lib/types';

const OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.cookie = `theme=${theme}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function select(next: Theme): void {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          onClick={() => select(option.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            theme === option.value
              ? 'bg-accent text-accent-foreground'
              : 'cursor-pointer text-muted-foreground hover:bg-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
