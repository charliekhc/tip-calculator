import { describe, expect, it } from 'vitest';
import { isCurrencyCode } from '../src/money/currency.js';

describe('currency exponent table', () => {
  it('accepts USD', () => {
    expect(isCurrencyCode('USD')).toBe(true);
  });

  it.each(['EUR', 'JPY', 'usd', '', 'toString', '__proto__', 'constructor'])('rejects %j', (code) => {
    expect(isCurrencyCode(code)).toBe(false);
  });
});
