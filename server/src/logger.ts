import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

// Logger estructurado (pino) — sustituye a console.log/error en el runtime del servidor.
// En desarrollo se imprime bonito con pino-pretty; en producción JSON plano (ingestible).
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
});
