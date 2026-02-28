import { Type } from '@sinclair/typebox';

import type { FastifyPluginAsync } from 'fastify';

import { usersCol } from '@modules/auth/auth.repo.js';
import { Permissions } from '@domain/permissions.js';
import { ErrorResponse } from '@shared/openapi.js';

const plugin: FastifyPluginAsync = async (app) => {
  app.get(
    '/me',
    {
      preHandler: [app.requirePerm(Permissions.UsersRead)],
      schema: {
        tags: ['users'],
        security: [{ bearerAuth: [] }],
        response: {
          200: Type.Object({
            id: Type.String(),
            email: Type.String(),
            roles: Type.Array(Type.String())
          }),
          401: ErrorResponse,
          403: ErrorResponse
        }
      }
    },
    async (req) => {
      const u = await usersCol(app.db).findOne(
        { _id: req.auth!.userId },
        { projection: { passwordHash: 0 } }
      );

      return { id: u!._id, email: u!.email, roles: u!.roles ?? [] };
    }
  );
};

export default plugin;
