import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/load.js';

const config: AppConfig = {
  allowedTipPercents: [0n, 10n, 15n, 20n],
  currency: 'USD',
  maxBillCents: 100000000n,
  maxPeople: 100n,
  maxBodyBytes: 1024,
  host: '127.0.0.1',
  port: 3000,
};

describe('buildApp', () => {
  it('serves POST /split and answers a request with no Content-Type and no body with 415', async () => {
    const app = buildApp(config);
    const response = await app.inject({ method: 'POST', url: '/split' });
    expect(response.statusCode).toBe(415);
    await app.close();
  });

  it('removes the built-in text/plain parser', async () => {
    const app = buildApp(config);
    expect(app.hasContentTypeParser('text/plain')).toBe(false);
    expect(app.hasContentTypeParser('application/json')).toBe(true);
    await app.close();
  });
});
