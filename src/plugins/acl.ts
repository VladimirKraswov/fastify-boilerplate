import fp from 'fastify-plugin';

import type { Permission } from '@domain/permissions.js';
import type { preHandlerHookHandler } from 'fastify';

import { hasPerm } from '@domain/roles.js';
import { E } from '@shared/http.js';

export default fp(async (app) => {
  app.decorate('requirePerm', (perm: Permission | Permission[]): preHandlerHookHandler => {
    return async (req) => {
      if (!req.auth) throw E.unauthorized();
      if (!hasPerm(req.auth.perms, perm)) throw E.forbidden();
    };
  });
});
