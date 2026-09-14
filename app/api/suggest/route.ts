import { parseQuery, suggestQuerySchema } from '@/lib/request-schema';
import { toErrorResponse, toSuccessResponse } from '@/lib/response-handler';
import { getCities } from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { q } = parseQuery(suggestQuerySchema, request);

    const searchedCities = await getCities(q);
    const response = toSuccessResponse(searchedCities);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
