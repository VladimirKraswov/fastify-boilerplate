#!/usr/bin/env node
/**
 * create-fastify-platform.mjs
 *
 * Usage:
 *   node create-fastify-platform.mjs my-platform
 *
 * Then:
 *   cd my-platform
 *   npm i
 *   cp .env.example .env
 *   npm run dev
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectName = process.argv[2] || 'fastify-mongo-ts-platform';
const root = path.resolve(process.cwd(), projectName);

const files = new Map();

/** helpers */
const toPosix = (p) => p.replace(/\\/g, '/');
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}
async function writeFile(rel, content) {
  const abs = path.join(root, rel);
  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, content, 'utf8');
}
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** ---- Templates ---- **/

files.set(
  'package.json',
  JSON.stringify(
    {
      name: projectName,
      version: '1.0.0',
      private: true,
      type: 'module',
      scripts: {
        dev: 'tsx watch src/server.ts',
        build: 'tsc -p tsconfig.json',
        start: 'node dist/server.js',
        test: 'vitest run'
      },
      dependencies: {
        fastify: '^5.0.0',
        mongodb: '^6.0.0',
        dotenv: '^16.0.0',
        nanoid: '^5.0.0',
        argon2: '^0.31.0',
        '@sinclair/typebox': '^0.34.0',
        '@fastify/type-provider-typebox': '^5.0.0',

        '@fastify/sensible': '^6.0.0',
        '@fastify/helmet': '^12.0.0',
        '@fastify/rate-limit': '^10.0.0',
        '@fastify/cookie': '^10.0.0',
        '@fastify/multipart': '^9.0.0',
        '@fastify/jwt': '^9.0.0',

        '@fastify/swagger': '^9.0.0',
        '@fastify/swagger-ui': '^5.0.0'
      },
      devDependencies: {
        typescript: '^5.0.0',
        tsx: '^4.0.0',
        vitest: '^2.0.0',
        '@types/node': '^20.0.0'
      }
    },
    null,
    2
  ) + '\n'
);

files.set(
  'tsconfig.json',
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'Bundler',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        skipLibCheck: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        types: ['node'],
        noEmitOnError: true
      },
      include: ['src/**/*.ts', 'src/types/**/*.d.ts']
    },
    null,
    2
  ) + '\n'
);

files.set(
  '.gitignore',
  `node_modules
dist
.env
uploads
.DS_Store
coverage
\n`
);

files.set(
  '.env.example',
  `MONGO_URI=mongodb://localhost:27017
MONGO_DB=app
JWT_ACCESS_SECRET=change_me_access
JWT_REFRESH_SECRET=change_me_refresh
ACCESS_TTL_SEC=900
REFRESH_TTL_SEC=2592000
UPLOAD_DIR=./uploads
COOKIE_SECURE=false
# COOKIE_DOMAIN=yourdomain.com
\n`
);

files.set(
  'README.md',
  `# ${projectName}

## Setup
\`\`\`bash
npm i
cp .env.example .env
npm run dev
\`\`\`

- Health: \`GET /health\`
- Swagger UI: \`GET /docs\`
- OpenAPI JSON: \`GET /documentation/json\`

## Modules
- Auth: \`/v1/auth\`
- Users: \`/v1/users\`
- Files: \`/v1/files\`
\n`
);

/** src/config/env.ts */
files.set(
  'src/config/env.ts',
  `import 'dotenv/config';

const required = (key: string) => {
  const v = process.env[key];
  if (!v) throw new Error(\`Missing env: \${key}\`);
  return v;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  HOST: process.env.HOST ?? '0.0.0.0',

  MONGO_URI: required('MONGO_URI'),
  MONGO_DB: process.env.MONGO_DB ?? 'app',

  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  ACCESS_TTL_SEC: Number(process.env.ACCESS_TTL_SEC ?? 900), // 15m
  REFRESH_TTL_SEC: Number(process.env.REFRESH_TTL_SEC ?? 60 * 60 * 24 * 30), // 30d

  COOKIE_SECURE: (process.env.COOKIE_SECURE ?? 'false') === 'true',
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,

  UPLOAD_DIR: process.env.UPLOAD_DIR ?? './uploads'
};
`
);

/** src/shared/http.ts */
files.set(
  'src/shared/http.ts',
  `export class AppError extends Error {
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
`
);

/** src/shared/openapi.ts */
files.set(
  'src/shared/openapi.ts',
  `import { Type } from '@sinclair/typebox';

export const ErrorResponse = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Unknown())
  })
});
`
);

/** src/shared/ids.ts */
files.set(
  'src/shared/ids.ts',
  `import { nanoid as _nanoid } from 'nanoid';
export const nanoid = (n?: number) => _nanoid(n);
`
);

/** src/shared/logger.ts */
files.set(
  'src/shared/logger.ts',
  `export const pinoLogger = (env: string) => ({
  level: env === 'production' ? 'info' : 'debug',
  transport: env === 'production' ? undefined : { target: 'pino-pretty' }
});
`
);

/** src/types/fastify.d.ts */
files.set(
  'src/types/fastify.d.ts',
  `import 'fastify';
import { Db } from 'mongodb';
import { StorageProvider } from '../plugins/storage.js';
import { Permission } from '../domain/permissions.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    storage: StorageProvider;
    requirePerm: (perm: Permission | Permission[]) => any;

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
`
);

/** domain */
files.set(
  'src/domain/permissions.ts',
  `export const Permissions = {
  UsersRead: 'users:read',
  UsersWrite: 'users:write',
  FilesRead: 'files:read',
  FilesWrite: 'files:write',
  Admin: 'admin:*'
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];
`
);

files.set(
  'src/domain/roles.ts',
  `import { Permissions, Permission } from './permissions.js';

export const RolePerms: Record<string, Permission[]> = {
  user: [Permissions.FilesRead, Permissions.FilesWrite],
  manager: [Permissions.UsersRead, Permissions.FilesRead, Permissions.FilesWrite],
  admin: [Permissions.Admin]
};

export function expandPerms(roles: string[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) {
    for (const p of (RolePerms[r] ?? [])) set.add(p);
  }
  return [...set];
}

export function hasPerm(userPerms: Permission[], need: Permission | Permission[]) {
  const needs = Array.isArray(need) ? need : [need];
  if (userPerms.includes(Permissions.Admin)) return true;
  return needs.every((n) => userPerms.includes(n));
}
`
);

/** plugins */
files.set(
  'src/plugins/errors.ts',
  `import fp from 'fastify-plugin';
import { AppError, mapErrorToResponse } from '../shared/http.js';

export default fp(async (app) => {
  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'request error');

    if (err instanceof AppError) {
      const body = mapErrorToResponse(err);
      return reply.code(err.statusCode).send(body);
    }

    // @ts-expect-error fastify validation shape
    if (err.validation) {
      // @ts-expect-error
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.validation }
      });
    }

    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Unexpected error' }
    });
  });
});
`
);

files.set(
  'src/plugins/security.ts',
  `import fp from 'fastify-plugin';

export default fp(async (app) => {
  // place for future security hooks: CORS, request-id, etc.
});
`
);

files.set(
  'src/plugins/db.ts',
  `import fp from 'fastify-plugin';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

export default fp(async (app) => {
  const client = new MongoClient(env.MONGO_URI);
  await client.connect();

  const db = client.db(env.MONGO_DB);
  app.decorate('db', db);

  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('files').createIndex({ ownerId: 1, createdAt: -1 });

  app.addHook('onClose', async () => {
    await client.close();
  });
});
`
);

files.set(
  'src/plugins/swagger.ts',
  `import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

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
`
);

files.set(
  'src/plugins/auth.ts',
  `import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { env } from '../config/env.js';
import { E } from '../shared/http.js';
import { usersCol } from '../modules/auth/auth.repo.js';
import { expandPerms } from '../domain/roles.js';

type JwtPayload = { userId: string; sessionId: string; roles: string[] };

export default fp(async (app) => {
  await app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  app.decorateRequest('auth', null);

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
`
);

files.set(
  'src/plugins/acl.ts',
  `import fp from 'fastify-plugin';
import { E } from '../shared/http.js';
import { hasPerm } from '../domain/roles.js';
import type { Permission } from '../domain/permissions.js';

export default fp(async (app) => {
  app.decorate('requirePerm', (perm: Permission | Permission[]) => {
    return async (req: any) => {
      if (!req.auth) throw E.unauthorized();
      if (!hasPerm(req.auth.perms, perm)) throw E.forbidden();
    };
  });
});
`
);

files.set(
  'src/plugins/storage.ts',
  `import fp from 'fastify-plugin';
import { env } from '../config/env.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { nanoid } from '../shared/ids.js';

export type StoredFile = {
  key: string;
  url: string;
  size: number;
  mime: string;
  originalName: string;
};

export interface StorageProvider {
  save(input: { buffer: Buffer; mime: string; originalName: string }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  constructor(private dir: string) {}

  async save(input: { buffer: Buffer; mime: string; originalName: string }) {
    await fs.mkdir(this.dir, { recursive: true });
    const ext = safeExt(input.originalName);
    const key = \`\${nanoid()}\${ext}\`;
    const filePath = path.join(this.dir, key);
    await fs.writeFile(filePath, input.buffer);

    return {
      key,
      url: \`/v1/files/raw/\${key}\`,
      size: input.buffer.byteLength,
      mime: input.mime,
      originalName: input.originalName
    };
  }

  async remove(key: string) {
    const filePath = path.join(this.dir, key);
    await fs.rm(filePath, { force: true });
  }
}

function safeExt(name: string) {
  const ext = path.extname(name).slice(0, 10);
  return ext && ext.startsWith('.') ? ext : '';
}

export default fp(async (app) => {
  app.decorate('storage', new LocalStorageProvider(env.UPLOAD_DIR));
});
`
);

/** app + server */
files.set(
  'src/app.ts',
  `import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import sensible from '@fastify/sensible';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';

import { env } from './config/env.js';
import { pinoLogger } from './shared/logger.js';

import dbPlugin from './plugins/db.js';
import errorsPlugin from './plugins/errors.js';
import securityPlugin from './plugins/security.js';
import swaggerPlugin from './plugins/swagger.js';
import authPlugin from './plugins/auth.js';
import aclPlugin from './plugins/acl.js';
import storagePlugin from './plugins/storage.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import filesRoutes from './modules/files/files.routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: pinoLogger(env.NODE_ENV)
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(sensible);
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
`
);

files.set(
  'src/server.ts',
  `import { buildApp } from './app.js';
import { env } from './config/env.js';

const app = await buildApp();
await app.listen({ port: env.PORT, host: env.HOST });
`
);

/** modules/auth */
files.set(
  'src/modules/auth/auth.schemas.ts',
  `import { Type } from '@sinclair/typebox';

export const RegisterBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 })
});

export const LoginBody = RegisterBody;

export const AuthResponse = Type.Object({
  accessToken: Type.String()
});
`
);

files.set(
  'src/modules/auth/auth.repo.ts',
  `import { Collection, Db } from 'mongodb';

export type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type SessionDoc = {
  _id: string; // sessionId
  userId: string;
  refreshHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  ua?: string;
  ip?: string;
};

export function usersCol(db: Db): Collection<UserDoc> {
  return db.collection<UserDoc>('users');
}

export function sessionsCol(db: Db): Collection<SessionDoc> {
  return db.collection<SessionDoc>('sessions');
}
`
);

files.set(
  'src/modules/auth/auth.routes.ts',
  `import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import argon2 from 'argon2';

import { RegisterBody, LoginBody, AuthResponse } from './auth.schemas.js';
import { sessionsCol } from './auth.repo.js';
import { env } from '../../config/env.js';
import { nanoid } from '../../shared/ids.js';
import { E } from '../../shared/http.js';
import { ErrorResponse } from '../../shared/openapi.js';

const RefreshCookie = 'refresh_token';
const SessionCookie = 'sid';

const plugin: FastifyPluginAsync = async (app) => {
  app.post(
    '/register',
    {
      schema: {
        tags: ['auth'],
        body: RegisterBody,
        response: { 200: Type.Object({ ok: Type.Boolean() }), 409: ErrorResponse }
      }
    },
    async (req) => {
      const { email, password } = req.body as any;

      const normalized = String(email).toLowerCase();
      const existing = await app.db.collection('users').findOne({ email: normalized });
      if (existing) throw E.conflict('Email already in use');

      const now = new Date();
      const userId = nanoid();
      const passwordHash = await argon2.hash(String(password));

      await app.db.collection('users').insertOne({
        _id: userId,
        email: normalized,
        passwordHash,
        roles: ['user'],
        createdAt: now,
        updatedAt: now
      });

      return { ok: true };
    }
  );

  app.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        body: LoginBody,
        response: { 200: AuthResponse, 401: ErrorResponse }
      }
    },
    async (req, reply) => {
      const { email, password } = req.body as any;

      const normalized = String(email).toLowerCase();
      const user = await app.db.collection('users').findOne({ email: normalized });
      if (!user) throw E.unauthorized('Invalid credentials');

      const ok = await argon2.verify(user.passwordHash, String(password));
      if (!ok) throw E.unauthorized('Invalid credentials');

      const sessionId = nanoid();
      const refreshRaw = nanoid(48);
      const refreshHash = await argon2.hash(refreshRaw);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + env.REFRESH_TTL_SEC * 1000);

      await sessionsCol(app.db).insertOne({
        _id: sessionId,
        userId: user._id,
        refreshHash,
        createdAt: now,
        expiresAt,
        ua: req.headers['user-agent'],
        ip: req.ip
      });

      const accessToken = app.signAccess({
        userId: user._id,
        sessionId,
        roles: user.roles ?? ['user']
      });

      reply
        .setCookie(SessionCookie, sessionId, cookieOpts(expiresAt))
        .setCookie(RefreshCookie, refreshRaw, cookieOpts(expiresAt, true));

      return { accessToken };
    }
  );

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        response: { 200: AuthResponse, 401: ErrorResponse }
      }
    },
    async (req, reply) => {
      const sid = (req.cookies as any)[SessionCookie];
      const refresh = (req.cookies as any)[RefreshCookie];
      if (!sid || !refresh) throw E.unauthorized();

      const session = await sessionsCol(app.db).findOne({ _id: sid });
      if (!session || session.revokedAt) throw E.unauthorized();
      if (session.expiresAt.getTime() < Date.now()) throw E.unauthorized();

      const ok = await argon2.verify(session.refreshHash, String(refresh));
      if (!ok) throw E.unauthorized();

      // rotation
      const newRefresh = nanoid(48);
      const newHash = await argon2.hash(newRefresh);
      await sessionsCol(app.db).updateOne({ _id: sid }, { $set: { refreshHash: newHash } });

      const roles = await app.loadUserRoles(session.userId);
      const accessToken = app.signAccess({
        userId: session.userId,
        sessionId: sid,
        roles
      });

      reply.setCookie(RefreshCookie, newRefresh, cookieOpts(session.expiresAt, true));
      return { accessToken };
    }
  );

  app.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        response: { 200: Type.Object({ ok: Type.Boolean() }) }
      }
    },
    async (req, reply) => {
      const sid = (req.cookies as any)[SessionCookie];
      if (sid) await sessionsCol(app.db).updateOne({ _id: sid }, { $set: { revokedAt: new Date() } });

      reply.clearCookie(SessionCookie).clearCookie(RefreshCookie);
      return { ok: true };
    }
  );
};

function cookieOpts(expiresAt: Date, httpOnly = true) {
  return {
    httpOnly,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
    expires: expiresAt
  };
}

export default plugin;
`
);

/** modules/users */
files.set(
  'src/modules/users/users.routes.ts',
  `import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { Permissions } from '../../domain/permissions.js';
import { ErrorResponse } from '../../shared/openapi.js';

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
      const u = await app.db.collection('users').findOne(
        { _id: req.auth!.userId },
        { projection: { passwordHash: 0 } }
      );

      return { id: u!._id, email: u!.email, roles: u!.roles ?? [] };
    }
  );
};

export default plugin;
`
);

/** modules/files */
files.set(
  'src/modules/files/files.routes.ts',
  `import type { FastifyPluginAsync } from 'fastify';
import path from 'node:path';
import { createReadStream } from 'node:fs';

import { Permissions } from '../../domain/permissions.js';
import { env } from '../../config/env.js';
import { E } from '../../shared/http.js';
import { ErrorResponse } from '../../shared/openapi.js';
import { Type } from '@sinclair/typebox';

const plugin: FastifyPluginAsync = async (app) => {
  app.post(
    '/upload',
    {
      preHandler: [app.requirePerm(Permissions.FilesWrite)],
      schema: {
        tags: ['files'],
        security: [{ bearerAuth: [] }],
        response: {
          200: Type.Object({
            file: Type.Object({
              key: Type.String(),
              url: Type.String(),
              size: Type.Number(),
              mime: Type.String(),
              originalName: Type.String()
            })
          }),
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse
        }
      }
    },
    async (req) => {
      const part = await req.file();
      if (!part) throw E.badRequest('No file');

      const chunks = [];
      for await (const c of part.file) chunks.push(c);
      const buffer = Buffer.concat(chunks);

      const stored = await app.storage.save({
        buffer,
        mime: part.mimetype,
        originalName: part.filename
      });

      await app.db.collection('files').insertOne({
        _id: stored.key,
        ownerId: req.auth!.userId,
        mime: stored.mime,
        size: stored.size,
        originalName: stored.originalName,
        createdAt: new Date()
      });

      return { file: stored };
    }
  );

  app.get(
    '/raw/:key',
    {
      schema: {
        tags: ['files'],
        response: { 200: Type.Any(), 404: ErrorResponse }
      }
    },
    async (req, reply) => {
      const { key } = req.params as any;

      const meta = await app.db.collection('files').findOne({ _id: key });
      if (!meta) throw E.notFound();

      const filePath = path.join(env.UPLOAD_DIR, key);
      reply.type(meta.mime);
      return reply.send(createReadStream(filePath));
    }
  );

  app.delete(
    '/:key',
    {
      preHandler: [app.requirePerm(Permissions.FilesWrite)],
      schema: {
        tags: ['files'],
        security: [{ bearerAuth: [] }],
        response: { 200: Type.Object({ ok: Type.Boolean() }), 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse }
      }
    },
    async (req) => {
      const { key } = req.params as any;

      const meta = await app.db.collection('files').findOne({ _id: key });
      if (!meta) throw E.notFound();

      const isAdmin = req.auth!.perms.includes('admin:*' as any);
      if (meta.ownerId !== req.auth!.userId && !isAdmin) throw E.forbidden();

      await app.storage.remove(key);
      await app.db.collection('files').deleteOne({ _id: key });

      return { ok: true };
    }
  );
};

export default plugin;
`
);

/** placeholder test */
files.set(
  'test/auth.e2e.test.ts',
  `import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
`
);

/** ---- Scaffold runner ---- **/
async function main() {
  if (await exists(root)) {
    console.error(`❌ Folder already exists: ${root}`);
    process.exit(1);
  }

  await ensureDir(root);

  for (const [rel, content] of files.entries()) {
    await writeFile(rel, content);
  }

  console.log(`✅ Project created: ${root}`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${toPosix(projectName)}`);
  console.log(`  npm i`);
  console.log(`  cp .env.example .env`);
  console.log(`  npm run dev`);
  console.log(`\nSwagger: http://localhost:3000/docs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
