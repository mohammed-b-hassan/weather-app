import { CurrentWeather, ForecastDay } from '../types';
import { OwmCurrent, OwmForecast } from './schema';
const MIN_ENTRIES_FOR_FULL_DAY = 4;
const FORECAST_DAYS = 5;
/** YYYY-MM-DD and hour in the *city's* local time, derived from the UTC offset. */
function localParts(
  utcSeconds: number,
  offsetSeconds: number,
): { date: string; hour: number } {
  const shifted = new Date((utcSeconds + offsetSeconds) * 1000);
  return {
    date: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
  };
}
export function toCurrentWeather(raw: OwmCurrent): CurrentWeather {
  const condition = raw.weather[0];
  return {
    tempC: Math.round(raw.main.temp),
    feelsLikeC: Math.round(raw.main.feels_like),
    humidity: raw.main.humidity,
    windSpeedMs: raw.wind.speed,
    description: condition.description,
    iconCode: condition.icon,
    observedAt: new Date(raw.dt * 1000).toISOString(),
  };
}
export function toForecastDays(raw: OwmForecast): ForecastDay[] {
  const grouped = new Map<string, typeof raw.list>();
  const offset = raw.city.timezone;
  raw.list.forEach((item) => {
    const { date } = localParts(item.dt, offset);
    const exist = grouped.get(date);
    if (exist) exist.push(item);
    else grouped.set(date, [item]);
  });

  const days = [...grouped].map(([date, entries]) => {
    const closestToNoon = entries.reduce((best, entry) => {
      const distance = Math.abs(localParts(entry.dt, offset).hour - 12);
      const bestDistance = Math.abs(localParts(best.dt, offset).hour - 12);
      return distance < bestDistance ? entry : best;
    });
    const condition = closestToNoon.weather[0];

    return {
      date,
      minC: Math.round(Math.min(...entries.map((e) => e.main.temp_min))),
      maxC: Math.round(Math.max(...entries.map((e) => e.main.temp_max))),
      description: condition.description,
      iconCode: condition.icon,
      isPartialDay: entries.length < MIN_ENTRIES_FOR_FULL_DAY,
    };
  });
  return days[0]?.isPartialDay && days.length > 5
    ? days.slice(1, 6)
    : days.slice(0, 5);
}
