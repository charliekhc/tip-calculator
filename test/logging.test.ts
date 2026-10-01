import { describe, expect, it } from 'vitest';
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

const SENSITIVE_QUERY = 'email=person%40example.com&key=sensitive-value-xyz';
const CALLER_ADDRESS = '203.0.113.7';

async function logsFor(url: string): Promise<{ statusCode: number; logs: string }> {
  const lines: string[] = [];
  const app = buildApp(config, loggerFor({ write: (message) => void lines.push(message) }));
  app.get('/boom', () => {
    throw new Error('boom');
  });
  const response = await app.inject({ method: 'GET', url, remoteAddress: CALLER_ADDRESS });
  await app.close();
  return { statusCode: response.statusCode, logs: lines.join('') };
}

function expectNoPersonalData(logs: string): void {
  expect(logs).not.toContain('person');
  expect(logs).not.toContain('example.com');
  expect(logs).not.toContain('sensitive-value-xyz');
  expect(logs).not.toContain(SENSITIVE_QUERY);
  expect(logs).not.toContain(CALLER_ADDRESS);
  expect(logs).not.toContain('remoteAddress');
}

describe('logging (UNI-09)', () => {
  it('keeps the query string and caller address out of the logs on a 404', async () => {
    const { statusCode, logs } = await logsFor(`/split?${SENSITIVE_QUERY}`);
    expect(statusCode).toBe(404);
    expectNoPersonalData(logs);
  });

  it('keeps the query string and caller address out of the logs on a 500', async () => {
    const { statusCode, logs } = await logsFor(`/boom?${SENSITIVE_QUERY}`);
    expect(statusCode).toBe(500);
    expectNoPersonalData(logs);
    expect(logs).toContain('"msg":"request failed"');
    expect(logs).not.toContain('/boom');
  });

  it('still writes log lines to the stream', async () => {
    const lines: string[] = [];
    const app = buildApp(config, loggerFor({ write: (message) => void lines.push(message) }));
    app.log.info('hello');
    await app.close();
    expect(lines.join('')).toContain('hello');
  });
});
