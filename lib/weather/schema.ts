import { z } from 'zod';

const conditionSchema = z.object({
  id: z.number(),
  main: z.string(),
  description: z.string(),
  icon: z.string(),
});

export const owmCurrentSchema = z.object({
  coord: z.object({ lat: z.number(), lon: z.number() }),
  weather: z.array(conditionSchema).min(1),
  main: z.object({
    temp: z.number(),
    feels_like: z.number(),
    humidity: z.number(),
  }),
  wind: z.object({ speed: z.number() }),
  dt: z.number(),
  timezone: z.number(),
  name: z.string(),
  sys: z.object({ country: z.string().optional() }),
});

export const owmForecastSchema = z.object({
  list: z
    .array(
      z.object({
        dt: z.number(),
        main: z.object({
          temp: z.number(),
          temp_min: z.number(),
          temp_max: z.number(),
        }),
        weather: z.array(conditionSchema).min(1),
      }),
    )
    .min(1),
  city: z.object({
    name: z.string(),
    country: z.string(),
    timezone: z.number(),
    coord: z.object({ lat: z.number(), lon: z.number() }),
  }),
});

export const owmCitiesSchema = z.array(
  z.object({
    name: z.string(),
    lat: z.number(),
    lon: z.number(),
    country: z.string(),
    state: z.string().optional(),
  }),
);

export type OwmCurrent = z.infer<typeof owmCurrentSchema>;
export type OwmForecast = z.infer<typeof owmForecastSchema>;
