import { toErrorResponse, toSuccessResponse } from '@/lib/response-handler';
import { getCities } from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    const searchedCities = await getCities(query);
    const response = toSuccessResponse(searchedCities);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
