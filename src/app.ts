import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './config/load.js';

export function buildApp(config: AppConfig, logger = false): FastifyInstance {
  return Fastify({ bodyLimit: config.maxBodyBytes, logger });
}
