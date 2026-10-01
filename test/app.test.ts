import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import type { AppConfig } from '../src/config/load.js';

const config: AppConfig = {
  allowedTipPercents: [0n, 10n, 15n, 20n],
  suggestedTipPercent: 15n,
  currency: 'USD',
  maxBillCents: 100000000n,
  maxPeople: 100n,
  maxBodyBytes: 1024,
  host: '127.0.0.1',
  port: 3000,
};

describe('buildApp (M1: no routes)', () => {
  it('returns 404 for POST /split because the route is not built yet', async () => {
    const app = buildApp(config);
    const response = await app.inject({ method: 'POST', url: '/split' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
