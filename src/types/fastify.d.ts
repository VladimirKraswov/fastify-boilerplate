import { Db } from 'mongodb';

import type { Permission } from '@domain/permissions.js';
import type { StorageProvider } from '@plugins/storage.js';
import type { preHandlerHookHandler } from 'fastify';

import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    storage: StorageProvider;

    requirePerm: (perm: Permission | Permission[]) => preHandlerHookHandler;

    // auth helpers
    signAccess: (payload: { userId: string; sessionId: string; roles: string[] }) => string;
    loadUserRoles: (userId: string) => Promise<string[]>;
  }

  interface FastifyRequest {
    auth?: {
      userId: string;
      sessionId: string;
      roles: string[];
      perms: Permission[];
    };
  }
}
