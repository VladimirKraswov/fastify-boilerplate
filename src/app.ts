import compress from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';

import { env } from '@config/env.js';
import aclPlugin from '@plugins/acl.js';
import authPlugin from '@plugins/auth.js';
import dbPlugin from '@plugins/db.js';
import errorsPlugin from '@plugins/errors.js';
import securityPlugin from '@plugins/security.js';
import storagePlugin from '@plugins/storage.js';
import swaggerPlugin from '@plugins/swagger.js';
import authRoutes from '@modules/auth/auth.routes.js';
import filesRoutes from '@modules/files/files.routes.js';
import usersRoutes from '@modules/users/users.routes.js';
import { pinoLogger } from '@shared/logger.js';

export async function buildApp() {
  const app = Fastify({
    logger: pinoLogger(env.NODE_ENV)
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(sensible);
  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? ['https://example.com'] : true,
    credentials: true
  });

  await app.register(compress, { global: true });
  await app.register(helmet);
  await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });
  await app.register(cookie, { secret: env.JWT_REFRESH_SECRET, hook: 'onRequest' });
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  await app.register(errorsPlugin);
  await app.register(securityPlugin);

  await app.register(swaggerPlugin);

  await app.register(dbPlugin);
  await app.register(storagePlugin);
  await app.register(authPlugin);
  await app.register(aclPlugin);

  await app.register(authRoutes, { prefix: '/v1/auth' });
  await app.register(usersRoutes, { prefix: '/v1/users' });
  await app.register(filesRoutes, { prefix: '/v1/files' });

  app.get('/health', async () => ({ ok: true }));

  return app;
}
