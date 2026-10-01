import type { FastifyServerOptions } from 'fastify';

type LogStream = { write(message: string): void };

export function loggerFor(stream?: LogStream): FastifyServerOptions['logger'] {
  return {
    level: 'info',
    serializers: {
      req: (request) => ({ method: request.method }),
      res: (response) => ({ statusCode: response.statusCode }),
    },
    ...(stream === undefined ? {} : { stream }),
  };
}
