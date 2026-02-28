import jwt from '@fastify/jwt';
import fp from 'fastify-plugin';

import { env } from '@config/env.js';
import { usersCol } from '@modules/auth/auth.repo.js';
import { expandPerms } from '@domain/roles.js';
import { E } from '@shared/http.js';

type JwtPayload = { userId: string; sessionId: string; roles: string[] };

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  // Fastify v5: нельзя null — используем undefined
  app.decorateRequest('auth', undefined);

  app.addHook('preHandler', async (req) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return;

    try {
      const payload = await req.jwtVerify<JwtPayload>();
      req.auth = {
        userId: payload.userId,
        sessionId: payload.sessionId,
        roles: payload.roles,
        perms: expandPerms(payload.roles)
      };
    } catch {
      req.auth = undefined;
    }
  });

  app.decorate('signAccess', (payload: JwtPayload) => {
    return app.jwt.sign(payload, { expiresIn: env.ACCESS_TTL_SEC });
  });

  app.decorate('loadUserRoles', async (userId: string) => {
    const u = await usersCol(app.db).findOne({ _id: userId }, { projection: { roles: 1 } });
    if (!u) throw E.unauthorized('User not found');
    return u.roles ?? ['user'];
  });
});
