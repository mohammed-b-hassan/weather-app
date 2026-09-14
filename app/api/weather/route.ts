import { parseQuery, weatherQuerySchema } from '@/lib/request-schema';
import { toErrorResponse, toSuccessResponse } from '@/lib/response-handler';
import { getCity, getWeatherForCity } from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { city } = parseQuery(weatherQuerySchema, request);

    const searchedCity = await getCity(city);
    const result = await getWeatherForCity(searchedCity);
    const response = toSuccessResponse(result);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
