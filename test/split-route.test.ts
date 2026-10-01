import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/load.js';
import { loggerFor } from '../src/logging.js';

const config: AppConfig = {
  allowedTipPercents: [0n, 10n, 15n, 20n],
  currency: 'USD',
  maxBillCents: 100000000n,
  maxPeople: 100n,
  maxBodyBytes: 1024,
  host: '127.0.0.1',
  port: 3000,
};

const SPEC_EXAMPLE = `{
  "currency": "USD",
  "billCents": 12050,
  "tipPercent": 15,
  "tipCents": 1808,
  "totalCents": 13858,
  "people": 3,
  "sharesCents": [4620, 4619, 4619]
}`;

const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function appFor(appConfig: AppConfig = config, logger?: ReturnType<typeof loggerFor>): FastifyInstance {
  const app = buildApp(appConfig, logger);
  apps.push(app);
  return app;
}

async function postJson(payload: string, appConfig: AppConfig = config) {
  return appFor(appConfig).inject({
    method: 'POST',
    url: '/split',
    headers: { 'content-type': 'application/json' },
    payload,
  });
}

function body(bill: string, tip: string, people: string): string {
  return `{"billCents":${bill},"tipPercent":${tip},"people":${people}}`;
}

function errorCode(response: { body: string }): string {
  return (JSON.parse(response.body) as { error: { code: string } }).error.code;
}

describe('POST /split happy path', () => {
  it('returns the spec section 4 example byte for byte', async () => {
    const response = await postJson('{"billCents":12050,"tipPercent":15,"people":3}');
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(response.body).toBe(SPEC_EXAMPLE);
  });

  it('accepts a JSON content type with a charset parameter', async () => {
    const response = await appFor().inject({
      method: 'POST',
      url: '/split',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      payload: body('12050', '15', '3'),
    });
    expect(response.body).toBe(SPEC_EXAMPLE);
  });

  it('handles the largest values from a custom config exactly', async () => {
    const wide: AppConfig = { ...config, allowedTipPercents: [100n], maxBillCents: 1000000000000n, maxPeople: 1000n };
    const response = await postJson(body('1000000000000', '100', '1000'), wide);
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('"totalCents": 2000000000000,');
    expect(response.body).toContain(`"sharesCents": [${new Array(1000).fill('2000000000').join(', ')}]`);
  });
});

describe('POST /split body errors (400 INVALID_BODY)', () => {
  it.each([
    ['decimal point', body('12050.0', '15', '3')],
    ['exponent', body('1e3', '15', '3')],
    ['fraction', body('1.5', '15', '3')],
    ['string', body('"12050"', '15', '3')],
    ['boolean', body('true', '15', '3')],
    ['null', body('null', '15', '3')],
    ['array value', body('[12050]', '15', '3')],
    ['nested object', body('{"cents":12050}', '15', '3')],
    ['top-level array', '[12050, 15, 3]'],
    ['duplicate key', '{"billCents":12050,"billCents":1,"tipPercent":15,"people":3}'],
    ['unknown key tipCents', '{"billCents":12050,"tipPercent":15,"people":3,"tipCents":1808}'],
    ['missing billCents', '{"tipPercent":15,"people":3}'],
    ['missing tipPercent', '{"billCents":12050,"people":3}'],
    ['missing people', '{"billCents":12050,"tipPercent":15}'],
    ['19-digit number', body('1234567890123456789', '15', '3')],
    ['huge digit count', body('9'.repeat(400), '15', '3')],
    ['tipPercent 15.5', body('12050', '15.5', '3')],
    ['tipPercent "15"', body('12050', '"15"', '3')],
    ['bad JSON', '{"billCents":12050,'],
    ['empty body', ''],
  ])('%s', async (_name, payload) => {
    const response = await postJson(payload);
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('INVALID_BODY');
  });

  it('rejects a body over maxBodyBytes', async () => {
    const payload = `{"billCents":12050,"tipPercent":15,"people":3${' '.repeat(config.maxBodyBytes)}}`;
    const response = await postJson(payload);
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('INVALID_BODY');
  });

  it('rejects a body whose length does not match Content-Length', async () => {
    const response = await appFor().inject({
      method: 'POST',
      url: '/split',
      headers: { 'content-type': 'application/json', 'content-length': '3' },
      payload: body('12050', '15', '3'),
    });
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe('INVALID_BODY');
  });
});

describe('POST /split range errors', () => {
  it.each([
    ['billCents 0', body('0', '15', '3'), 'INVALID_BILL'],
    ['billCents -1', body('-1', '15', '3'), 'INVALID_BILL'],
    ['billCents max + 1', body('100000001', '15', '3'), 'INVALID_BILL'],
    ['billCents 9007199254740993 (not rounded)', body('9007199254740993', '15', '3'), 'INVALID_BILL'],
    ['tipPercent 5', body('12050', '5', '3'), 'INVALID_TIP_PERCENT'],
    ['tipPercent -10', body('12050', '-10', '3'), 'INVALID_TIP_PERCENT'],
    ['tipPercent 100', body('12050', '100', '3'), 'INVALID_TIP_PERCENT'],
    ['people 0', body('12050', '15', '0'), 'INVALID_PEOPLE'],
    ['people -3', body('12050', '15', '-3'), 'INVALID_PEOPLE'],
    ['people max + 1', body('12050', '15', '101'), 'INVALID_PEOPLE'],
  ])('%s', async (_name, payload, code) => {
    const response = await postJson(payload);
    expect(response.statusCode).toBe(400);
    expect(errorCode(response)).toBe(code);
  });

  it('builds the tip message from the config list', async () => {
    const response = await postJson(body('12050', '5', '3'));
    expect(response.body).toBe(
      '{ "error": { "code": "INVALID_TIP_PERCENT", "message": "tipPercent must be one of 0, 10, 15, 20" } }',
    );
  });

  it.each([
    ['billCents 1', body('1', '15', '3')],
    ['billCents max', body('100000000', '15', '3')],
    ['people 1', body('12050', '15', '1')],
    ['people max', body('12050', '15', '100')],
  ])('accepts %s', async (_name, payload) => {
    expect((await postJson(payload)).statusCode).toBe(200);
  });

  it('follows a changed tip list with no code change', async () => {
    const custom: AppConfig = { ...config, allowedTipPercents: [0n, 5n] };
    expect((await postJson(body('12050', '5', '3'), custom)).statusCode).toBe(200);
    const rejected = await postJson(body('12050', '10', '3'), custom);
    expect(rejected.statusCode).toBe(400);
    expect(rejected.body).toContain('"message": "tipPercent must be one of 0, 5"');
  });
});

describe('POST /split content type (415)', () => {
  it.each([
    ['text/plain', { 'content-type': 'text/plain' }, body('12050', '15', '3')],
    ['a near miss', { 'content-type': 'application/jsonx' }, body('12050', '15', '3')],
    ['form data', { 'content-type': 'application/x-www-form-urlencoded' }, 'billCents=12050'],
    ['no content type with a body', {}, body('12050', '15', '3')],
    ['no content type and no body', {}, undefined],
  ])('rejects %s', async (_name, headers, payload) => {
    const response = await appFor().inject({ method: 'POST', url: '/split', headers, ...(payload === undefined ? {} : { payload }) });
    expect(response.statusCode).toBe(415);
    expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
    expect(errorCode(response)).toBe('UNSUPPORTED_MEDIA_TYPE');
  });
});

describe('other methods and paths', () => {
  it.each(['GET', 'PUT', 'DELETE'] as const)('%s /split falls through to the framework default', async (method) => {
    const response = await appFor().inject({ method, url: '/split' });
    expect([404, 405]).toContain(response.statusCode);
  });

  it('POST to an unknown path is 404', async () => {
    const response = await appFor().inject({
      method: 'POST',
      url: '/other',
      headers: { 'content-type': 'application/json' },
      payload: body('12050', '15', '3'),
    });
    expect(response.statusCode).toBe(404);
  });
});

describe('unexpected errors (500 INTERNAL)', () => {
  it('returns a generic body with no stack and logs only a sanitized line', async () => {
    const lines: string[] = [];
    const app = appFor(config, loggerFor({ write: (message) => void lines.push(message) }));
    app.addHook('preHandler', async () => {
      throw new Error('detail-that-must-not-leak at /split');
    });
    const response = await app.inject({
      method: 'POST',
      url: '/split?email=person%40example.com',
      headers: { 'content-type': 'application/json', 'x-caller': 'header-value-xyz' },
      payload: body('12050', '15', '3'),
      remoteAddress: '203.0.113.7',
    });

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe('{ "error": { "code": "INTERNAL", "message": "internal error" } }');

    const logs = lines.join('');
    expect(logs).toContain('"msg":"request failed"');
    expect(logs).toContain('"errorName":"Error"');
    for (const leak of ['detail-that-must-not-leak', '/split', 'example.com', 'header-value-xyz', '203.0.113.7', '12050', 'stack']) {
      expect(logs).not.toContain(leak);
    }
  });
});
