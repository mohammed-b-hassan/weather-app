import { describe, expect, test } from 'bun:test';
import { toCurrentWeather, toForecastDays } from './normalize';
import type { OwmCurrent, OwmForecast } from './schema';

const HOUR_SECONDS = 3600;

function entry(
  iso: string,
  tempMin: number,
  tempMax: number,
  icon = '01d',
  description = 'clear sky',
): OwmForecast['list'][number] {
  return {
    dt: Date.parse(iso) / 1000,
    main: {
      temp: (tempMin + tempMax) / 2,
      temp_min: tempMin,
      temp_max: tempMax,
    },
    weather: [{ id: 800, main: 'Clear', description, icon }],
  };
}

function fullDay(
  date: string,
  tempMin: number,
  tempMax: number,
): OwmForecast['list'] {
  return ['00', '06', '12', '18'].map((hour) =>
    entry(`${date}T${hour}:00:00Z`, tempMin, tempMax),
  );
}

function forecast(list: OwmForecast['list'], timezone = 0): OwmForecast {
  return {
    list,
    city: {
      name: 'Testville',
      country: 'TS',
      timezone,
      coord: { lat: 0, lon: 0 },
    },
  };
}

const current: OwmCurrent = {
  coord: { lat: 48.86, lon: 2.35 },
  weather: [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }],
  main: { temp: 18.6, feels_like: 17.4, humidity: 72 },
  wind: { speed: 4.1 },
  dt: Date.parse('2026-03-01T09:30:00Z') / 1000,
  timezone: 3600,
  name: 'Paris',
  sys: { country: 'FR' },
};

describe('toCurrentWeather', () => {
  test('rounds temperatures to whole degrees', () => {
    const weather = toCurrentWeather(current);

    expect(weather.tempC).toBe(19);
    expect(weather.feelsLikeC).toBe(17);
  });

  test('passes humidity and wind speed through unchanged', () => {
    const weather = toCurrentWeather(current);

    expect(weather.humidity).toBe(72);
    expect(weather.windSpeedMs).toBe(4.1);
  });

  test('converts the unix timestamp to an iso string', () => {
    expect(toCurrentWeather(current).observedAt).toBe(
      '2026-03-01T09:30:00.000Z',
    );
  });

  test('takes the description and icon from the first condition', () => {
    const weather = toCurrentWeather(current);

    expect(weather.description).toBe('light rain');
    expect(weather.iconCode).toBe('10d');
  });
});

describe('toForecastDays', () => {
  test('returns one entry per day, capped at five days', () => {
    const days = toForecastDays(
      forecast([
        ...fullDay('2026-03-01', 5, 10),
        ...fullDay('2026-03-02', 6, 11),
        ...fullDay('2026-03-03', 7, 12),
        ...fullDay('2026-03-04', 8, 13),
        ...fullDay('2026-03-05', 9, 14),
        ...fullDay('2026-03-06', 10, 15),
      ]),
    );

    expect(days).toHaveLength(5);
    expect(days.map((day) => day.date)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ]);
  });

  test('takes the minimum and maximum across every entry in a day', () => {
    const [day] = toForecastDays(
      forecast([
        entry('2026-03-01T00:00:00Z', 2, 6),
        entry('2026-03-01T06:00:00Z', 4, 11),
        entry('2026-03-01T12:00:00Z', 7, 14),
        entry('2026-03-01T18:00:00Z', 3, 9),
      ]),
    );

    expect(day.minC).toBe(2);
    expect(day.maxC).toBe(14);
  });

  test('describes a day using the entry closest to local noon', () => {
    const [day] = toForecastDays(
      forecast([
        entry('2026-03-01T00:00:00Z', 2, 6, '01n', 'clear sky'),
        entry('2026-03-01T09:00:00Z', 4, 11, '04d', 'overcast clouds'),
        entry('2026-03-01T13:00:00Z', 7, 14, '10d', 'light rain'),
        entry('2026-03-01T21:00:00Z', 3, 9, '13n', 'snow'),
      ]),
    );

    expect(day.iconCode).toBe('10d');
    expect(day.description).toBe('light rain');
  });

  test('flags a day with fewer than four entries as partial', () => {
    const days = toForecastDays(
      forecast([
        ...fullDay('2026-03-01', 5, 10),
        entry('2026-03-02T00:00:00Z', 6, 11),
        entry('2026-03-02T06:00:00Z', 6, 11),
      ]),
    );

    expect(days[0].isPartialDay).toBe(false);
    expect(days[1].isPartialDay).toBe(true);
  });

  test('drops a partial first day when a sixth day is available', () => {
    const days = toForecastDays(
      forecast([
        entry('2026-03-01T21:00:00Z', 5, 10),
        ...fullDay('2026-03-02', 6, 11),
        ...fullDay('2026-03-03', 7, 12),
        ...fullDay('2026-03-04', 8, 13),
        ...fullDay('2026-03-05', 9, 14),
        ...fullDay('2026-03-06', 10, 15),
      ]),
    );

    expect(days).toHaveLength(5);
    expect(days[0].date).toBe('2026-03-02');
  });

  test('keeps a partial first day when there is no sixth day to fall back on', () => {
    const days = toForecastDays(
      forecast([
        entry('2026-03-01T21:00:00Z', 5, 10),
        ...fullDay('2026-03-02', 6, 11),
      ]),
    );

    expect(days.map((day) => day.date)).toEqual(['2026-03-01', '2026-03-02']);
  });

  test('groups by the local calendar of the city rather than utc', () => {
    const list = [
      entry('2026-03-01T00:00:00Z', 5, 10),
      entry('2026-03-01T13:00:00Z', 6, 11),
    ];

    expect(
      toForecastDays(forecast(list, 12 * HOUR_SECONDS)).map((day) => day.date),
    ).toEqual(['2026-03-01', '2026-03-02']);
    expect(toForecastDays(forecast(list, 0)).map((day) => day.date)).toEqual([
      '2026-03-01',
    ]);
  });
});
