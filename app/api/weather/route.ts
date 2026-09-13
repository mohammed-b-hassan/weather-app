import { toErrorResponse, toSuccessResponse } from '@/lib/response-handler';
import { getCity, getWeatherForCity } from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('city') || '';

    const searchedCity = await getCity(query);
    if (!searchedCity) return Response.json({ error: 'no city' });

    const result = await getWeatherForCity(searchedCity);
    const response = toSuccessResponse(result);

    return Response.json(response);
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse);
  }
}
