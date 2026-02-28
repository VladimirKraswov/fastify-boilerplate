import { promises as fs } from 'node:fs';
import path from 'node:path';

import fp from 'fastify-plugin';

import { env } from '@config/env.js';
import { nanoid } from '@shared/ids.js';

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
    const key = `${nanoid()}${ext}`;
    const filePath = path.join(this.dir, key);
    await fs.writeFile(filePath, input.buffer);

    return {
      key,
      url: `/v1/files/raw/${key}`,
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
