import { z } from 'zod';

import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  MONGO_URI: z.string().min(1),
  MONGO_DB: z.string().default('app'),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TTL_SEC: z.coerce.number().default(900),
  REFRESH_TTL_SEC: z.coerce.number().default(60 * 60 * 24 * 30),

  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().optional(),

  UPLOAD_DIR: z.string().default('./uploads')
});

export const env = envSchema.parse(process.env);
