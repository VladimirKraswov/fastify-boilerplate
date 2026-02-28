import { type Static, Type } from '@sinclair/typebox';
import argon2 from 'argon2';

import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { env } from '@config/env.js';
import { E } from '@shared/http.js';
import { nanoid } from '@shared/ids.js';
import { ErrorResponse } from '@shared/openapi.js';

import { sessionsCol, usersCol } from './auth.repo.js';
import { AuthResponse, LoginBody, RefreshBody, RegisterBody } from './auth.schemas.js';

type RegisterBodyT = Static<typeof RegisterBody>;
type LoginBodyT = Static<typeof LoginBody>;
type RefreshBodyT = Static<typeof RefreshBody>;
type EmptyBody = Record<string, never>;

const RefreshCookie = 'refresh_token';
const SessionCookie = 'sid';

type AuthMode = 'cookie' | 'token';

const AuthModeHeader = Type.Object(
  {
    'x-auth-mode': Type.Optional(Type.Union([Type.Literal('cookie'), Type.Literal('token')]))
  },
  { additionalProperties: true }
);

const LogoutBodyOrEmpty = Type.Union([
  Type.Object({ sessionId: Type.Optional(Type.String()) }),
  Type.Object({}, { additionalProperties: false })
]);

type LogoutBodyT = Static<typeof LogoutBodyOrEmpty>;

const plugin: FastifyPluginAsyncTypebox = async (app) => {
  const users = usersCol(app.db);
  const sessions = sessionsCol(app.db);

  app.post<{ Body: RegisterBodyT }>(
    '/register',
    {
      schema: {
        tags: ['auth'],
        body: RegisterBody,
        response: { 200: Type.Object({ ok: Type.Boolean() }), 409: ErrorResponse }
      }
    },
    async (req) => {
      const { email, password } = req.body; // ✅ typed
      const normalized = email.toLowerCase();

      const existing = await users.findOne({ email: normalized });
      if (existing) throw E.conflict('Email already in use');

      const now = new Date();
      await users.insertOne({
        _id: nanoid(),
        email: normalized,
        passwordHash: await argon2.hash(password),
        roles: ['user'],
        createdAt: now,
        updatedAt: now
      });

      return { ok: true };
    }
  );

  app.post<{ Body: LoginBodyT }>(
    '/login',
    {
      schema: {
        tags: ['auth'],
        headers: Type.Optional(AuthModeHeader),
        body: LoginBody,
        response: { 200: AuthResponse, 401: ErrorResponse }
      }
    },
    async (req, reply) => {
      const mode = getMode(req.headers);
      const { email, password } = req.body; // ✅ typed
      const normalized = email.toLowerCase();

      const user = await users.findOne({ email: normalized });
      if (!user) throw E.unauthorized('Invalid credentials');

      const ok = await argon2.verify(user.passwordHash, password);
      if (!ok) throw E.unauthorized('Invalid credentials');

      const sessionId = nanoid();
      const refreshRaw = nanoid(48);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + env.REFRESH_TTL_SEC * 1000);

      await sessions.insertOne({
        _id: sessionId,
        userId: user._id,
        refreshHash: await argon2.hash(refreshRaw),
        createdAt: now,
        expiresAt,
        ua: req.headers['user-agent'],
        ip: req.ip
      });

      const accessToken = app.signAccess({
        userId: user._id,
        sessionId,
        roles: user.roles
      });

      if (mode === 'cookie') {
        reply
          .setCookie(SessionCookie, sessionId, cookieOpts(expiresAt))
          .setCookie(RefreshCookie, refreshRaw, cookieOpts(expiresAt));
        return { accessToken };
      }

      return { accessToken, refreshToken: refreshRaw, sessionId };
    }
  );

  app.post<{ Body: RefreshBodyT | EmptyBody }>(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        headers: Type.Optional(AuthModeHeader),
        body: Type.Optional(
          Type.Union([RefreshBody, Type.Object({}, { additionalProperties: false })])
        ),
        response: { 200: AuthResponse, 401: ErrorResponse }
      }
    },
    async (req, reply) => {
      const mode = getMode(req.headers);

      const { sessionId, refreshToken } = getRefreshInput(mode, req.cookies, req.body);
      if (!sessionId || !refreshToken) throw E.unauthorized();

      const session = await sessions.findOne({ _id: sessionId });
      if (!session || session.revokedAt) throw E.unauthorized();
      if (session.expiresAt.getTime() < Date.now()) throw E.unauthorized();

      const ok = await argon2.verify(session.refreshHash, refreshToken);
      if (!ok) throw E.unauthorized();

      const newRefresh = nanoid(48);
      await sessions.updateOne(
        { _id: sessionId },
        { $set: { refreshHash: await argon2.hash(newRefresh) } }
      );

      const roles = await app.loadUserRoles(session.userId);
      const accessToken = app.signAccess({
        userId: session.userId,
        sessionId,
        roles
      });

      if (mode === 'cookie') {
        reply.setCookie(RefreshCookie, newRefresh, cookieOpts(session.expiresAt));
        return { accessToken };
      }

      return { accessToken, refreshToken: newRefresh, sessionId };
    }
  );

  app.post<{ Body: LogoutBodyT | undefined }>(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        headers: Type.Optional(AuthModeHeader),
        body: Type.Optional(LogoutBodyOrEmpty),
        response: { 200: Type.Object({ ok: Type.Boolean() }) }
      }
    },
    async (req, reply) => {
      const mode = getMode(req.headers);

      const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
      const body = req.body ?? {};

      const sessionId =
        mode === 'cookie'
          ? cookies[SessionCookie]
          : isLogoutBody(body)
            ? body.sessionId
            : undefined;

      if (sessionId)
        await sessions.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } });

      reply.clearCookie(SessionCookie).clearCookie(RefreshCookie);
      return { ok: true };
    }
  );
};

function getMode(headers: Record<string, unknown>): AuthMode {
  const raw = headers['x-auth-mode'];
  return raw === 'token' ? 'token' : 'cookie';
}

function isRefreshBody(body: unknown): body is { sessionId: string; refreshToken: string } {
  if (!isRecord(body)) return false;
  return typeof body.sessionId === 'string' && typeof body.refreshToken === 'string';
}

function isLogoutBody(body: unknown): body is { sessionId?: string } {
  if (!isRecord(body)) return false;
  const v = body.sessionId;
  return typeof v === 'string' || typeof v === 'undefined';
}

function getRefreshInput(
  mode: AuthMode,
  cookiesRaw: unknown,
  body: unknown
): { sessionId?: string; refreshToken?: string } {
  if (mode === 'cookie') {
    const cookies = (cookiesRaw ?? {}) as Record<string, string | undefined>;
    return { sessionId: cookies[SessionCookie], refreshToken: cookies[RefreshCookie] };
  }

  return isRefreshBody(body) ? { sessionId: body.sessionId, refreshToken: body.refreshToken } : {};
}

function cookieOpts(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.COOKIE_SECURE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
    expires: expiresAt
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

export default plugin;
