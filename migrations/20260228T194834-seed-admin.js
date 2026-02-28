// migrations/20260228183000-seed-admin.js
import argon2 from 'argon2';
import { nanoid } from 'nanoid';

export const up = async (db) => {
  const users = db.collection('users');
  const existing = await users.findOne({ email: 'admin@example.com' });
  if (!existing) {
    await users.insertOne({
      _id: nanoid(),
      email: 'admin@example.com',
      passwordHash: await argon2.hash('admin123'),
      roles: ['admin'],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin user created');
  } else {
    console.log('Admin user already exists');
  }
};

export const down = async (db) => {
  await db.collection('users').deleteOne({ email: 'admin@example.com' });
  console.log('Admin user removed');
};
