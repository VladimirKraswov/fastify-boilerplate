import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { type Db, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

type TestCtx = {
  mongod: MongoMemoryServer;
  client: MongoClient;
  db: Db;
  uploadDir: string;
  close: () => Promise<void>;
};

export async function createTestCtx(): Promise<TestCtx> {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('test');

  const uploadDir = await mkdtemp(path.join(os.tmpdir(), 'fastify-upload-'));

  return {
    mongod,
    client,
    db,
    uploadDir,
    close: async () => {
      await client.close();
      await mongod.stop();
      await rm(uploadDir, { recursive: true, force: true });
    }
  };
}

/**
 * Динамический импорт app — чтобы process.env был выставлен ДО импорта env.ts
 */
export async function buildTestApp() {
  const { buildApp } = await import('../app.js');
  const app = await buildApp();
  await app.ready();
  return app;
}
