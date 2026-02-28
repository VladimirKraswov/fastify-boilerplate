export function setTestEnv(opts: { mongoUri: string; uploadDir: string }) {
  process.env.NODE_ENV = 'test';

  process.env.MONGO_URI = opts.mongoUri;
  process.env.MONGO_DB = 'test';

  process.env.PORT = '0';
  process.env.UPLOAD_DIR = opts.uploadDir;

  process.env.COOKIE_SECURE = 'false';
  process.env.COOKIE_DOMAIN = '';

  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

  process.env.ACCESS_TTL_SEC = '60';
  process.env.REFRESH_TTL_SEC = '3600';
}

export function getSetCookie(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [raw as string];
}

export function pickCookie(setCookies: string[], name: string): string | undefined {
  const found = setCookies.find((c) => c.startsWith(`${name}=`));
  return found?.split(';')[0];
}

export function cookieHeaderFrom(setCookies: string[], names: string[]): string {
  return names
    .map((n) => pickCookie(setCookies, n))
    .filter((v): v is string => !!v)
    .join('; ');
}
