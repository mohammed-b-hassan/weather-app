import { cookies } from 'next/headers';
import type { Theme } from './types';

export const THEME_COOKIE = 'theme';

export const DEFAULT_THEME: Theme = 'dark';

export async function readTheme(): Promise<Theme> {
  const value = (await cookies()).get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}
