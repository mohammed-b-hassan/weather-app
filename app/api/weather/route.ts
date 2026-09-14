import { parseQuery, weatherQuerySchema } from '@/lib/request-schema';
import { toErrorResponse, toSuccessResponse } from '@/lib/response-handler';
import {
  getCity,
  getWeatherAt,
  getWeatherForCity,
} from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const query = parseQuery(weatherQuerySchema, request);

    const result =
      'city' in query
        ? await getWeatherForCity(await getCity(query.city))
        : await getWeatherAt(query.lat, query.lon);
    const response = toSuccessResponse(result);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
