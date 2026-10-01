import { describe, expect, it } from 'vitest';
import { encodeError, encodeSplit } from '../src/http/encode.js';

const config = {
  allowedTipPercents: [0n, 10n, 15n, 20n],
  maxBillCents: 100000000n,
  maxPeople: 100n,
};

describe('encodeSplit', () => {
  it('writes the spec section 4 example byte for byte', () => {
    const body = encodeSplit(
      'USD',
      { billCents: 12050n, tipPercent: 15n, people: 3n },
      { tipCents: 1808n, totalCents: 13858n, sharesCents: [4620n, 4619n, 4619n] },
    );
    expect(body).toBe(
      [
        '{',
        '  "currency": "USD",',
        '  "billCents": 12050,',
        '  "tipPercent": 15,',
        '  "tipCents": 1808,',
        '  "totalCents": 13858,',
        '  "people": 3,',
        '  "sharesCents": [4620, 4619, 4619]',
        '}',
      ].join('\n'),
    );
  });

  it('writes large bigints as exact plain digits, never in exponent form', () => {
    const body = encodeSplit(
      'USD',
      { billCents: 1000000000000n, tipPercent: 100n, people: 1n },
      { tipCents: 1000000000000n, totalCents: 2000000000000n, sharesCents: [9007199254740993n] },
    );
    expect(body).toContain('"billCents": 1000000000000,');
    expect(body).toContain('"totalCents": 2000000000000,');
    expect(body).toContain('"sharesCents": [9007199254740993]');
    expect(body).not.toMatch(/[eE][+-]?\d/);
  });

  it('escapes quotes, backslashes and control characters in strings', () => {
    const tricky = 'a"b\\c\n\r\t\b\f\u0001\u001f/é';
    const body = encodeSplit(
      tricky,
      { billCents: 1n, tipPercent: 0n, people: 1n },
      { tipCents: 0n, totalCents: 1n, sharesCents: [1n] },
    );
    expect(body).toContain('"currency": "a\\"b\\\\c\\n\\r\\t\\b\\f\\u0001\\u001f/é",');
    expect((JSON.parse(body) as { currency: string }).currency).toBe(tricky);
  });
});

describe('encodeError', () => {
  it('writes the spec section 4 error shape with the tip list from config', () => {
    expect(encodeError('INVALID_TIP_PERCENT', config)).toBe(
      '{ "error": { "code": "INVALID_TIP_PERCENT", "message": "tipPercent must be one of 0, 10, 15, 20" } }',
    );
  });

  it('builds the tip message from whatever list config holds', () => {
    expect(encodeError('INVALID_TIP_PERCENT', { ...config, allowedTipPercents: [0n, 5n] })).toContain(
      '"message": "tipPercent must be one of 0, 5"',
    );
  });

  it('builds the range messages from config limits', () => {
    expect(encodeError('INVALID_BILL', config)).toContain('"message": "billCents must be an integer from 1 to 100000000"');
    expect(encodeError('INVALID_PEOPLE', config)).toContain('"message": "people must be an integer from 1 to 100"');
  });

  it.each(['INVALID_BODY', 'INVALID_BILL', 'INVALID_TIP_PERCENT', 'INVALID_PEOPLE', 'UNSUPPORTED_MEDIA_TYPE', 'INTERNAL'] as const)(
    'writes valid JSON for %s',
    (code) => {
      const parsed = JSON.parse(encodeError(code, config)) as { error: { code: string; message: string } };
      expect(Object.keys(parsed)).toEqual(['error']);
      expect(Object.keys(parsed.error)).toEqual(['code', 'message']);
      expect(parsed.error.code).toBe(code);
      expect(parsed.error.message.length).toBeGreaterThan(0);
    },
  );
});
