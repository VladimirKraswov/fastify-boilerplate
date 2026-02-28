import { randomBytes } from 'node:crypto';

import { setTestEnv } from '@test/helpers.js';
import { buildTestApp, createTestCtx } from '@test/test-env.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { usersCol } from '@modules/auth/auth.repo.js';

/** Собираем multipart body вручную */
function makeMultipartFile(opts: {
  fieldName?: string;
  filename: string;
  contentType: string;
  data: Buffer;
}) {
  const fieldName = opts.fieldName ?? 'file';
  const boundary = `----vitest-${randomBytes(12).toString('hex')}`;

  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${opts.filename}"\r\n` +
    `Content-Type: ${opts.contentType}\r\n` +
    `\r\n`;

  const tail = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([Buffer.from(head, 'utf8'), opts.data, Buffer.from(tail, 'utf8')]);

  return {
    boundary,
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

describe('files', () => {
  let ctx: Awaited<ReturnType<typeof createTestCtx>>;
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let accessToken = '';

  beforeAll(async () => {
    ctx = await createTestCtx();

    setTestEnv({ mongoUri: ctx.mongod.getUri(), uploadDir: ctx.uploadDir });

    app = await buildTestApp();

    // создаём пользователя + делаем админом, чтобы пройти requirePerm(FilesWrite)
    await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { email: 'admin-files@test.com', password: 'password123' }
    });

    await usersCol(app.db).updateOne(
      { email: 'admin-files@test.com' },
      { $set: { roles: ['admin'] } }
    );

    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin-files@test.com', password: 'password123' }
    });

    accessToken = login.json().accessToken as string;
    expect(accessToken).toBeTypeOf('string');
  });

  afterAll(async () => {
    if (app) await app.close();
    if (ctx) await ctx.close();
  });

  it('upload -> raw -> delete -> raw(404)', async () => {
    const fileBytes = Buffer.from('hello from vitest', 'utf8');

    const mp = makeMultipartFile({
      filename: 'hello.txt',
      contentType: 'text/plain',
      data: fileBytes
    });

    // 1) upload
    const upload = await app.inject({
      method: 'POST',
      url: '/v1/files/upload',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': mp.contentType
      },
      payload: mp.body
    });

    expect(upload.statusCode).toBe(200);

    const uploaded = upload.json();
    expect(uploaded.file).toBeTruthy();
    expect(uploaded.file.key).toBeTypeOf('string');
    expect(uploaded.file.mime).toBe('text/plain');
    expect(uploaded.file.originalName).toBe('hello.txt');
    expect(typeof uploaded.file.size).toBe('number');

    const key = uploaded.file.key as string;

    // 2) raw
    const raw = await app.inject({
      method: 'GET',
      url: `/v1/files/raw/${encodeURIComponent(key)}`
    });

    expect(raw.statusCode).toBe(200);
    expect(raw.headers['content-type']).toContain('text/plain');

    // fastify inject даёт rawPayload (Buffer) для бинарных ответов
    const rawBuf =
      (raw as unknown as { rawPayload?: Buffer }).rawPayload ?? Buffer.from(raw.body ?? '', 'utf8');

    expect(Buffer.isBuffer(rawBuf)).toBe(true);
    expect(rawBuf.equals(fileBytes)).toBe(true);

    // 3) delete
    const del = await app.inject({
      method: 'DELETE',
      url: `/v1/files/${encodeURIComponent(key)}`,
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ ok: true });

    // 4) raw after delete -> 404
    const raw2 = await app.inject({
      method: 'GET',
      url: `/v1/files/raw/${encodeURIComponent(key)}`
    });

    expect(raw2.statusCode).toBe(404);
  });

  it('upload without auth -> 401/403', async () => {
    const fileBytes = Buffer.from('no auth', 'utf8');

    const mp = makeMultipartFile({
      filename: 'noauth.txt',
      contentType: 'text/plain',
      data: fileBytes
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/files/upload',
      headers: { 'content-type': mp.contentType },
      payload: mp.body
    });

    // зависит от твоей логики: requirePerm может дать 401 или 403
    expect([401, 403]).toContain(res.statusCode);
  });
});
