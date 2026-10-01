import Fastify, { LogController, type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { AppConfig } from './config/load.js';

export function buildApp(config: AppConfig, logger: FastifyServerOptions['logger'] = false): FastifyInstance {
  return Fastify({
    bodyLimit: config.maxBodyBytes,
    logger,
    logController: new LogController({ disableRequestLogging: true }),
  });
}
