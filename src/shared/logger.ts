export const pinoLogger = (env: string) => ({
  level: env === 'production' ? 'info' : 'debug',
  transport: env === 'production' ? undefined : { target: 'pino-pretty' }
});
