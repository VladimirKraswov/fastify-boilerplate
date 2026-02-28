import fp from 'fastify-plugin';
import { MongoClient } from 'mongodb';

import { env } from '@config/env.js';

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
