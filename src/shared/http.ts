export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export const E = {
  badRequest: (m: string, d?: unknown) => new AppError(400, 'BAD_REQUEST', m, d),
  unauthorized: (m = 'Unauthorized') => new AppError(401, 'UNAUTHORIZED', m),
  forbidden: (m = 'Forbidden') => new AppError(403, 'FORBIDDEN', m),
  notFound: (m = 'Not found') => new AppError(404, 'NOT_FOUND', m),
  conflict: (m: string) => new AppError(409, 'CONFLICT', m)
};

export function mapErrorToResponse(err: AppError) {
  return { error: { code: err.code, message: err.message, details: err.details } };
}
