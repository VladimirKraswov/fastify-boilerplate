// migrations/20250228150000-init_indexes.js
export const up = async (db) => {
  // Пример создания индексов
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection('files').createIndex({ ownerId: 1, createdAt: -1 });
};

export const down = async (db) => {
  await db.collection('users').dropIndex('email_1');
  await db.collection('sessions').dropIndex('expiresAt_1');
  await db.collection('files').dropIndex('ownerId_1_-1_1');
};
