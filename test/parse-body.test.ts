import { describe, expect, it } from 'vitest';
import { parseBody } from '../src/http/parse-body.js';

const config = {
  allowedTipPercents: [0n, 10n, 15n, 20n],
  maxBillCents: 100000000n,
  maxPeople: 100n,
};

describe('parseBody', () => {
  it('returns bigint inputs for a valid body', () => {
    expect(parseBody('{"billCents":12050,"tipPercent":15,"people":3}', config)).toEqual({
      ok: true,
      input: { billCents: 12050n, tipPercent: 15n, people: 3n },
    });
  });

  it('accepts the keys in any order and with whitespace', () => {
    expect(parseBody(' { "people" : 3 , "billCents" : 1 , "tipPercent" : 0 } ', config)).toEqual({
      ok: true,
      input: { billCents: 1n, tipPercent: 0n, people: 3n },
    });
  });

  it.each([
    '',
    'not json',
    '[]',
    'null',
    '12050',
    '"text"',
    '{}',
    '{"billCents":12050.0,"tipPercent":15,"people":3}',
    '{"billCents":1e3,"tipPercent":15,"people":3}',
    '{"billCents":1.5,"tipPercent":15,"people":3}',
    '{"billCents":"12050","tipPercent":15,"people":3}',
    '{"billCents":true,"tipPercent":15,"people":3}',
    '{"billCents":null,"tipPercent":15,"people":3}',
    '{"billCents":[12050],"tipPercent":15,"people":3}',
    '{"billCents":{"value":12050},"tipPercent":15,"people":3}',
    '{"billCents":12050,"tipPercent":15,"people":3,"tipCents":1808}',
    '{"billCents":12050,"tipPercent":15}',
    '{"billCents":12050,"billCents":12050,"tipPercent":15,"people":3}',
    '{"billCents":1234567890123456789,"tipPercent":15,"people":3}',
    '{"billCents":-0,"tipPercent":15,"people":3}',
    '{"billCents":12050,"tipPercent":15,"people":3} {}',
    '{"__proto__":1,"tipPercent":15,"people":3}',
  ])('rejects %j as INVALID_BODY', (text) => {
    expect(parseBody(text, config)).toEqual({ ok: false, code: 'INVALID_BODY' });
  });

  it.each([
    ['0', 'INVALID_BILL'],
    ['-1', 'INVALID_BILL'],
    ['100000001', 'INVALID_BILL'],
    ['9007199254740993', 'INVALID_BILL'],
  ])('rejects billCents %s as %s', (bill, code) => {
    expect(parseBody(`{"billCents":${bill},"tipPercent":15,"people":3}`, config)).toEqual({ ok: false, code });
  });

  it.each(['5', '-10', '100', '1'])('rejects tipPercent %s as INVALID_TIP_PERCENT', (tip) => {
    expect(parseBody(`{"billCents":100,"tipPercent":${tip},"people":3}`, config)).toEqual({
      ok: false,
      code: 'INVALID_TIP_PERCENT',
    });
  });

  it.each(['0', '-1', '101'])('rejects people %s as INVALID_PEOPLE', (people) => {
    expect(parseBody(`{"billCents":100,"tipPercent":15,"people":${people}}`, config)).toEqual({
      ok: false,
      code: 'INVALID_PEOPLE',
    });
  });

  it('accepts each boundary value', () => {
    expect(parseBody('{"billCents":1,"tipPercent":0,"people":1}', config).ok).toBe(true);
    expect(parseBody('{"billCents":100000000,"tipPercent":20,"people":100}', config).ok).toBe(true);
  });

  it('checks fields in the order bill, tip, people', () => {
    expect(parseBody('{"billCents":0,"tipPercent":5,"people":0}', config)).toEqual({ ok: false, code: 'INVALID_BILL' });
    expect(parseBody('{"billCents":1,"tipPercent":5,"people":0}', config)).toEqual({
      ok: false,
      code: 'INVALID_TIP_PERCENT',
    });
  });

  it('reads the allowed tip list from config', () => {
    const custom = { ...config, allowedTipPercents: [0n, 5n] };
    expect(parseBody('{"billCents":100,"tipPercent":5,"people":1}', custom).ok).toBe(true);
    expect(parseBody('{"billCents":100,"tipPercent":10,"people":1}', custom)).toEqual({
      ok: false,
      code: 'INVALID_TIP_PERCENT',
    });
  });
});
