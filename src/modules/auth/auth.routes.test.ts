import { cookieHeaderFrom, getSetCookie, setTestEnv } from '@test/helpers.js';
import { buildTestApp, createTestCtx } from '@test/test-env.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('auth', () => {
  let ctx: Awaited<ReturnType<typeof createTestCtx>>;
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    ctx = await createTestCtx();

    setTestEnv({ mongoUri: ctx.mongod.getUri(), uploadDir: ctx.uploadDir });

    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
    await ctx.close();
  });

  it('register -> ok', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'a@test.com', password: 'password123' }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('login cookie-mode sets cookies and returns accessToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'a@test.com', password: 'password123' }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');

    const setCookies = getSetCookie(res);
    // должны прийти sid и refresh_token
    expect(setCookies.some((c) => c.startsWith('sid='))).toBe(true);
    expect(setCookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('refresh cookie-mode rotates refresh and returns new accessToken', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'a@test.com', password: 'password123' }
    });

    const cookieHeader = cookieHeaderFrom(getSetCookie(login), ['sid', 'refresh_token']);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { cookie: cookieHeader },
      payload: {} // в cookie-mode тело не обязательно, данные берутся из куков
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');

    // refresh должен быть обновлён (set-cookie присутствует)
    const setCookies = getSetCookie(res);
    expect(setCookies.some((c) => c.startsWith('refresh_token='))).toBe(true);
  });

  it('login token-mode returns refreshToken+sessionId in body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-auth-mode': 'token' },
      payload: { email: 'a@test.com', password: 'password123' }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');
    expect(body.sessionId).toBeTypeOf('string');

    // в token-mode куки не обязательны (можно проверить что их нет/минимум)
  });

  it('refresh token-mode works with body', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-auth-mode': 'token' },
      payload: { email: 'a@test.com', password: 'password123' }
    });

    const { sessionId, refreshToken } = login.json();

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { 'x-auth-mode': 'token' },
      payload: { sessionId, refreshToken }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');
    expect(body.sessionId).toBe(sessionId);
  });
});
