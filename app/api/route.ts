import { AppError, toErrorResponse } from '@/lib/response-handler';

export async function GET() {
  try {
    throw new AppError('INVALID_METHOD');
  } catch (error) {
    const errorResponse = toErrorResponse(error);
    return Response.json(errorResponse);
  }
}
