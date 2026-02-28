import { Collection, Db } from 'mongodb';

export type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type SessionDoc = {
  _id: string; // sessionId
  userId: string;
  refreshHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  ua?: string;
  ip?: string;
};

export function usersCol(db: Db): Collection<UserDoc> {
  return db.collection<UserDoc>('users');
}

export function sessionsCol(db: Db): Collection<SessionDoc> {
  return db.collection<SessionDoc>('sessions');
}
