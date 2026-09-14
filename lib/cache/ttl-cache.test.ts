import { describe, expect, test } from 'bun:test';
import { TtlCache } from './ttl-cache';

function clock(start = 0) {
  let current = start;
  return {
    now: (): number => current,
    advance: (ms: number): void => {
      current += ms;
    },
  };
}

describe('TtlCache', () => {
  test('returns undefined for a key that was never set', () => {
    const cache = new TtlCache<string>(1000);

    expect(cache.get('paris')).toBeUndefined();
  });

  test('returns a stored value before the ttl elapses', () => {
    const time = clock();
    const cache = new TtlCache<string>(1000, time.now);

    cache.set('paris', 'sunny');
    time.advance(999);

    expect(cache.get('paris')).toBe('sunny');
  });

  test('expires a value once the ttl elapses', () => {
    const time = clock();
    const cache = new TtlCache<string>(1000, time.now);

    cache.set('paris', 'sunny');
    time.advance(1000);

    expect(cache.get('paris')).toBeUndefined();
  });

  test('evicts an expired entry instead of retaining it', () => {
    const time = clock();
    const cache = new TtlCache<string>(1000, time.now);

    cache.set('paris', 'sunny');
    time.advance(1000);
    cache.get('paris');

    expect(cache.size).toBe(0);
  });

  test('refreshes the expiry when an existing key is set again', () => {
    const time = clock();
    const cache = new TtlCache<string>(1000, time.now);

    cache.set('paris', 'sunny');
    time.advance(900);
    cache.set('paris', 'cloudy');
    time.advance(900);

    expect(cache.get('paris')).toBe('cloudy');
  });

  test('expires each key against its own deadline', () => {
    const time = clock();
    const cache = new TtlCache<string>(1000, time.now);

    cache.set('paris', 'sunny');
    time.advance(600);
    cache.set('london', 'rain');
    time.advance(600);

    expect(cache.get('paris')).toBeUndefined();
    expect(cache.get('london')).toBe('rain');
  });
});
