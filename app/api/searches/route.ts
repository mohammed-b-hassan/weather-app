import {
  AppError,
  toErrorResponse,
  toSuccessResponse,
} from '@/lib/response-handler';
import { getRecentSearch, recordSearch } from '@/lib/weather/service';
import { NextRequest } from 'next/server';

export async function GET() {
  try {
    const recentSearches = await getRecentSearch();
    const response = toSuccessResponse(recentSearches);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchTerm } = body;
    if (!searchTerm) throw new AppError('INVALID_INPUT');
    await recordSearch(searchTerm);

    const response = toSuccessResponse(null);

    return Response.json(response, { status: response.status });
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse, { status: errorResponse.status });
  }
}
