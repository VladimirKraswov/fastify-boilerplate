import fp from 'fastify-plugin';

import { AppError, mapErrorToResponse } from '@shared/http.js';

function hasValidation(err: unknown): err is { validation: unknown } {
  return !!err && typeof err === 'object' && 'validation' in err;
}

export default fp(async (app) => {
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request error');

    if (err instanceof AppError) {
      const body = mapErrorToResponse(err);
      return reply.code(err.statusCode).send(body);
    }

    if (hasValidation(err)) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.validation }
      });
    }

    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' }
    });
  });
});
