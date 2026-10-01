import { describe, expect, it } from 'vitest';
import { ExactJsonError, readExactJson, type ExactJsonErrorReason } from '../src/json/exact-json.js';

function reasonFor(text: string): ExactJsonErrorReason {
  try {
    readExactJson(text);
  } catch (error) {
    if (error instanceof ExactJsonError) return error.reason;
    throw error;
  }
  throw new Error(`expected ${text} to be rejected`);
}

describe('readExactJson integers', () => {
  it.each([
    ['0', 0n],
    ['7', 7n],
    ['-7', -7n],
    ['12050', 12050n],
    ['999999999999999999', 999999999999999999n],
    ['-999999999999999999', -999999999999999999n],
  ])('reads %s as a bigint', (text, expected) => {
    const value = readExactJson(text);
    expect(typeof value).toBe('bigint');
    expect(value).toBe(expected);
  });

  it('reads 9007199254740993 as exactly 9007199254740993n', () => {
    const value = readExactJson('{"billCents": 9007199254740993}');
    expect(value).toEqual({ billCents: 9007199254740993n });
    expect(value).not.toEqual({ billCents: 9007199254740992n });
  });

  it.each([
    ['1.5', 'not-integer'],
    ['1.0', 'not-integer'],
    ['12050.0', 'not-integer'],
    ['1000000000000.0', 'not-integer'],
    ['1e3', 'not-integer'],
    ['1E3', 'not-integer'],
    ['1e12', 'not-integer'],
    ['1e+3', 'not-integer'],
    ['-1.5', 'not-integer'],
    ['.5', 'unexpected-character'],
    ['+1', 'unexpected-character'],
    ['01', 'invalid-number'],
    ['00', 'invalid-number'],
    ['-01', 'invalid-number'],
    ['-', 'invalid-number'],
    ['1-2', 'invalid-number'],
    ['--1', 'invalid-number'],
    ['-0', 'negative-zero'],
    ['1000000000000000000', 'too-many-digits'],
    ['-1000000000000000000', 'too-many-digits'],
    ['NaN', 'unexpected-character'],
    ['Infinity', 'unexpected-character'],
  ] as const)('rejects number %s with %s', (text, reason) => {
    expect(reasonFor(text)).toBe(reason);
  });

  it('rejects a bad number nested in an object and names its path', () => {
    expect(() => readExactJson('{"a": [1, 2.5]}')).toThrow(/not-integer at position 10 \(at a\[1\]\)/);
  });
});

describe('readExactJson structure', () => {
  it('reads strings, booleans, null, arrays and objects', () => {
    expect(readExactJson(' {"s": "x", "t": true, "f": false, "n": null, "a": [1, [], {}]} ')).toEqual({
      s: 'x',
      t: true,
      f: false,
      n: null,
      a: [1n, [], {}],
    });
  });

  it('accepts only JSON whitespace between tokens', () => {
    expect(readExactJson('\t\r\n [ 1 ,\n2 ] \n')).toEqual([1n, 2n]);
    expect(reasonFor(' [1]')).toBe('unexpected-character');
    expect(reasonFor('﻿[1]')).toBe('unexpected-character');
  });

  it('returns objects with no prototype and keeps __proto__ as a plain key', () => {
    const value = readExactJson('{"__proto__": {"polluted": true}, "constructor": 1}');
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(Object.keys(value as object)).toEqual(['__proto__', 'constructor']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it.each([
    ['{"a": 1, "a": 2}', 'duplicate-key'],
    ['{"a": 1, "b": {"c": 1, "c": 1}}', 'duplicate-key'],
    ['{"__proto__": 1, "__proto__": 2}', 'duplicate-key'],
    ['[1, 2,]', 'unexpected-character'],
    ['{"a": 1,}', 'unexpected-character'],
    ['[1 2]', 'unexpected-character'],
    ['{"a" 1}', 'unexpected-character'],
    ['{a: 1}', 'unexpected-character'],
    ["{'a': 1}", 'unexpected-character'],
    ['[1', 'unexpected-end'],
    ['{"a": 1', 'unexpected-end'],
    ['{"a":', 'unexpected-end'],
    ['{', 'unexpected-end'],
    ['', 'unexpected-end'],
    ['   ', 'unexpected-end'],
    ['{} x', 'trailing-content'],
    ['1 2', 'trailing-content'],
    ['{}{}', 'trailing-content'],
    ['truex', 'trailing-content'],
    ['tru', 'unexpected-character'],
    ['True', 'unexpected-character'],
    ['undefined', 'unexpected-character'],
  ] as const)('rejects %j with %s', (text, reason) => {
    expect(reasonFor(text)).toBe(reason);
  });

  it('reports the duplicate key path', () => {
    expect(() => readExactJson('{"a": {"b": 1, "b": 2}}')).toThrow(/duplicate-key at position 15 \(at a\.b\)/);
  });

  it('allows nesting up to 32 levels and rejects 33', () => {
    expect(readExactJson(`${'['.repeat(32)}${']'.repeat(32)}`)).toBeInstanceOf(Array);
    expect(reasonFor(`${'['.repeat(33)}${']'.repeat(33)}`)).toBe('max-depth');
    expect(reasonFor(`${'{"a":'.repeat(33)}1${'}'.repeat(33)}`)).toBe('max-depth');
    expect(reasonFor('['.repeat(100_000))).toBe('max-depth');
  });
});

describe('readExactJson strings', () => {
  it('decodes every standard escape', () => {
    expect(readExactJson(String.raw`"\" \\ \/ \b \f \n \r \t A é é"`)).toBe(
      '" \\ / \b \f \n \r \t A é é',
    );
  });

  it('keeps non-ASCII characters as written', () => {
    expect(readExactJson('"café \u{1F600}"')).toBe('café \u{1F600}');
  });

  it.each([
    ['"abc', 'unterminated-string'],
    ['"abc\\', 'unterminated-string'],
    ['"\\"', 'unterminated-string'],
    ['"\\x"', 'invalid-escape'],
    ['"\\U0041"', 'invalid-escape'],
    ['"\\u12"', 'invalid-escape'],
    ['"\\u12', 'invalid-escape'],
    ['"\\u12G4"', 'invalid-escape'],
    ['"\\u-123"', 'invalid-escape'],
    ['"a\nb"', 'control-character'],
    ['"a\tb"', 'control-character'],
    ['"a\u0000b"', 'control-character'],
    ['"a\u001fb"', 'control-character'],
  ] as const)('rejects %j with %s', (text, reason) => {
    expect(reasonFor(text)).toBe(reason);
  });

  it('accepts DEL, which is not a JSON control character', () => {
    expect(readExactJson('"a\u007fb"')).toBe('a\u007fb');
  });
});
