import { AppError } from '../response-handler';
import { City, WeatherSnapshot } from '../types';
import { fetchCurrent, fetchForecast, searchCities } from './client';
import { toCurrentWeather, toForecastDays } from './normalize';

export async function getCity(query: string) {
  const trimmed = query.trim();
  if (!trimmed) throw new AppError('INVALID_INPUT');
  const matches = await searchCities(trimmed, 1);
  const city = matches[0];
  if (!city) throw new AppError('CITY_NOT_FOUND');
  return city;
}
export async function getWeatherForCity(city: City): Promise<WeatherSnapshot> {
  const [current, forecast] = await Promise.all([
    fetchCurrent(city.lat, city.lon),
    fetchForecast(city.lat, city.lon),
  ]);

  const result: WeatherSnapshot = {
    city,
    current: toCurrentWeather(current),
    forecast: toForecastDays(forecast),
    cached: false,
  };
  return result;
}
