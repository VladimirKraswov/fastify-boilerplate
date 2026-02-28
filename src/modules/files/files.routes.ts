import { createReadStream } from 'node:fs';
import path from 'node:path';

import { Type } from '@sinclair/typebox';

import type { FastifyPluginAsync } from 'fastify';
import type { Collection, Db } from 'mongodb';

import { env } from '@config/env.js';
import { Permissions } from '@domain/permissions.js';
import { E } from '@shared/http.js';
import { ErrorResponse } from '@shared/openapi.js';

type FileDoc = {
  _id: string; // stored.key
  ownerId: string; // userId
  mime: string;
  size: number;
  originalName: string;
  createdAt: Date;
};

function filesCol(db: Db): Collection<FileDoc> {
  return db.collection<FileDoc>('files');
}

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

      const chunks: Buffer[] = [];
      for await (const c of part.file) chunks.push(c as Buffer);
      const buffer = Buffer.concat(chunks);

      const stored = await app.storage.save({
        buffer,
        mime: part.mimetype,
        originalName: part.filename
      });

      await filesCol(app.db).insertOne({
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

  app.get<{ Params: { key: string } }>(
    '/raw/:key',
    {
      schema: {
        tags: ['files'],
        response: { 200: Type.Any(), 404: ErrorResponse }
      }
    },
    async (req, reply) => {
      const { key } = req.params;

      const meta = await filesCol(app.db).findOne({ _id: key });
      if (!meta) throw E.notFound();

      const filePath = path.join(env.UPLOAD_DIR, key);
      reply.type(meta.mime);
      return reply.send(createReadStream(filePath));
    }
  );

  app.delete<{ Params: { key: string } }>(
    '/:key',
    {
      preHandler: [app.requirePerm(Permissions.FilesWrite)],
      schema: {
        tags: ['files'],
        security: [{ bearerAuth: [] }],
        response: {
          200: Type.Object({ ok: Type.Boolean() }),
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse
        }
      }
    },
    async (req) => {
      const { key } = req.params;

      const meta = await filesCol(app.db).findOne({ _id: key });
      if (!meta) throw E.notFound();

      const isAdmin = req.auth!.perms.includes('admin:*');
      if (meta.ownerId !== req.auth!.userId && !isAdmin) throw E.forbidden();

      await app.storage.remove(key);
      await filesCol(app.db).deleteOne({ _id: key });

      return { ok: true };
    }
  );
};

export default plugin;
