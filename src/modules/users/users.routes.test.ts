import { setTestEnv } from '@test/helpers.js';
import { buildTestApp, createTestCtx } from '@test/test-env.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { usersCol } from '@modules/auth/auth.repo.js';

describe('users', () => {
  let ctx: Awaited<ReturnType<typeof createTestCtx>>;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let accessToken = '';

  beforeAll(async () => {
    ctx = await createTestCtx();
    setTestEnv({ mongoUri: ctx.mongod.getUri(), uploadDir: ctx.uploadDir });
    app = await buildTestApp();

    // регистрируем
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'admin@test.com', password: 'password123' }
    });

    // делаем админом напрямую в базе (тестовая среда)
    await usersCol(app.db).updateOne({ email: 'admin@test.com' }, { $set: { roles: ['admin'] } });

    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' }
    });

    accessToken = login.json().accessToken;
  });

  afterAll(async () => {
    await app.close();
    await ctx.close();
  });

  it('GET /v1/users/me returns profile', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users/me',
      headers: { authorization: `Bearer ${accessToken}` }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.email).toBe('admin@test.com');
    expect(Array.isArray(body.roles)).toBe(true);
  });
});
