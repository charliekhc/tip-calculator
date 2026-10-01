import { describe, expect, it } from 'vitest';
import { exponentFor, isCurrencyCode } from '../src/money/currency.js';

describe('currency exponent table', () => {
  it('gives USD exponent 2 as a bigint', () => {
    expect(exponentFor('USD')).toBe(2n);
  });

  it.each(['EUR', 'JPY', 'usd', '', 'toString', '__proto__', 'constructor'])('rejects %j', (code) => {
    expect(isCurrencyCode(code)).toBe(false);
    expect(() => exponentFor(code)).toThrow('unknown currency code');
  });
});
