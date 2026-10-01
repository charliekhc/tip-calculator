import Fastify, { LogController, type FastifyInstance, type FastifyReply, type FastifyServerOptions } from 'fastify';
import type { AppConfig } from './config/load.js';
import { encodeError, encodeSplit, type ErrorCode } from './http/encode.js';
import { parseBody } from './http/parse-body.js';
import { split } from './money/split.js';

const RESPONSE_CONTENT_TYPE = 'application/json; charset=utf-8';

const FRAMEWORK_ERRORS: ReadonlyMap<string, { readonly status: number; readonly code: ErrorCode }> = new Map([
  ['FST_ERR_CTP_INVALID_MEDIA_TYPE', { status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' }],
  ['FST_ERR_CTP_BODY_TOO_LARGE', { status: 400, code: 'INVALID_BODY' }],
  ['FST_ERR_CTP_INVALID_CONTENT_LENGTH', { status: 400, code: 'INVALID_BODY' }],
]);

export function buildApp(config: AppConfig, logger: FastifyServerOptions['logger'] = false): FastifyInstance {
  const app = Fastify({
    bodyLimit: config.maxBodyBytes,
    logger,
    logController: new LogController({ disableRequestLogging: true }),
  });

  // The built-in JSON parser reads numbers as floats; money must stay bigint (spec D5).
  app.removeAllContentTypeParsers();
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (_request, body, done) => {
    done(null, body);
  });

  app.setErrorHandler((error, request, reply) => {
    const code = errorCode(error);
    const known = code === undefined ? undefined : FRAMEWORK_ERRORS.get(code);
    if (known !== undefined) {
      sendJson(reply, known.status, encodeError(known.code, config));
      return;
    }
    request.log.error({ errorName: error instanceof Error ? error.name : typeof error, errorCode: code }, 'request failed');
    sendJson(reply, 500, encodeError('INTERNAL', config));
  });

  app.post('/split', (request, reply) => {
    // A string body means the application/json parser ran; without a Content-Type there is no body to read.
    if (typeof request.body !== 'string') {
      sendJson(reply, 415, encodeError('UNSUPPORTED_MEDIA_TYPE', config));
      return;
    }
    const parsed = parseBody(request.body, config);
    if (!parsed.ok) {
      sendJson(reply, 400, encodeError(parsed.code, config));
      return;
    }
    sendJson(reply, 200, encodeSplit(config.currency, parsed.input, split(parsed.input)));
  });

  return app;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function sendJson(reply: FastifyReply, status: number, body: string): void {
  void reply.code(status).type(RESPONSE_CONTENT_TYPE).send(body);
}
