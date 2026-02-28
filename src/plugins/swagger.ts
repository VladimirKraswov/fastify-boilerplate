import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Platform API',
        description: 'Fastify + MongoDB + TS boilerplate',
        version: '1.0.0'
      },
      tags: [
        { name: 'auth', description: 'Auth & sessions' },
        { name: 'users', description: 'Users' },
        { name: 'files', description: 'Files storage' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      }
    }
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true }
  });
});
