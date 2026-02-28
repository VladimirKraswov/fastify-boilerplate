#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('❌ Please provide a migration name');
  console.log('Usage: npm run migrate:create <migration-name>');
  process.exit(1);
}

// Формируем timestamp в формате YYYYMMDDHHmmss
const timestamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d{3}Z$/, '');

const fileName = `${timestamp}-${migrationName}.js`;
const migrationsDir = path.join(__dirname, '..', 'migrations');

// Шаблон содержимого миграции
const template = `export const up = async (db) => {
  // TODO: implement migration up
};

export const down = async (db) => {
  // TODO: implement migration down
};
`;

try {
  await fs.mkdir(migrationsDir, { recursive: true });
  const filePath = path.join(migrationsDir, fileName);
  await fs.writeFile(filePath, template);
  console.log(`✅ Migration created: ${fileName}`);
} catch (err) {
  console.error('❌ Failed to create migration:', err.message);
  process.exit(1);
}
