export type ExactJsonValue =
  | bigint
  | string
  | boolean
  | null
  | readonly ExactJsonValue[]
  | { readonly [key: string]: ExactJsonValue };

export type ExactJsonErrorReason =
  | 'unexpected-end'
  | 'unexpected-character'
  | 'trailing-content'
  | 'unterminated-string'
  | 'control-character'
  | 'invalid-escape'
  | 'not-integer'
  | 'invalid-number'
  | 'negative-zero'
  | 'too-many-digits'
  | 'duplicate-key'
  | 'max-depth';

export class ExactJsonError extends Error {
  override readonly name = 'ExactJsonError';
  readonly reason: ExactJsonErrorReason;
  readonly position: number;
  readonly path: string;

  constructor(reason: ExactJsonErrorReason, position: number, path: string) {
    super(`${reason} at position ${position}${path === '' ? '' : ` (at ${path})`}`);
    this.reason = reason;
    this.position = position;
    this.path = path;
  }
}

const MAX_DEPTH = 32;
const MAX_DIGITS = 18;
const INTEGER = /^-?(0|[1-9][0-9]*)$/;
const NUMBER_CHAR = /[0-9eE.+-]/;
const NUMBER_START = /[0-9-]/;
const WHITESPACE = ' \t\n\r';
const HEX_DIGITS = '0123456789abcdef';
const UNICODE_ESCAPE_HEX = /^[0-9a-f]{4}$/;
const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
};

export function readExactJson(text: string): ExactJsonValue {
  let pos = 0;

  function fail(reason: ExactJsonErrorReason, path: string, at: number = pos): never {
    throw new ExactJsonError(reason, at, path);
  }

  function skipWhitespace(): void {
    while (pos < text.length && WHITESPACE.includes(text.charAt(pos))) pos++;
  }

  function expectChar(char: string, path: string): void {
    if (pos >= text.length) fail('unexpected-end', path);
    if (text.charAt(pos) !== char) fail('unexpected-character', path);
    pos++;
  }

  function readValue(depth: number, path: string): ExactJsonValue {
    skipWhitespace();
    if (pos >= text.length) fail('unexpected-end', path);
    const char = text.charAt(pos);
    if (char === '{') return readObject(depth + 1, path);
    if (char === '[') return readArray(depth + 1, path);
    if (char === '"') return readString(path);
    if (NUMBER_START.test(char)) return readInteger(path);
    if (text.startsWith('true', pos)) return readLiteral('true', true);
    if (text.startsWith('false', pos)) return readLiteral('false', false);
    if (text.startsWith('null', pos)) return readLiteral('null', null);
    return fail('unexpected-character', path);
  }

  function readLiteral<T extends boolean | null>(word: string, value: T): T {
    pos += word.length;
    return value;
  }

  function readInteger(path: string): bigint {
    const start = pos;
    while (pos < text.length && NUMBER_CHAR.test(text.charAt(pos))) pos++;
    const raw = text.slice(start, pos);
    if (/[.eE]/.test(raw)) fail('not-integer', path, start);
    if (!INTEGER.test(raw)) fail('invalid-number', path, start);
    if (raw === '-0') fail('negative-zero', path, start);
    const digitCount = raw.startsWith('-') ? raw.length - 1 : raw.length;
    if (digitCount > MAX_DIGITS) fail('too-many-digits', path, start);
    return BigInt(raw);
  }

  function readString(path: string): string {
    pos++;
    let result = '';
    for (;;) {
      if (pos >= text.length) fail('unterminated-string', path);
      const char = text.charAt(pos);
      if (char === '"') {
        pos++;
        return result;
      }
      if (text.charCodeAt(pos) < 0x20) fail('control-character', path);
      if (char === '\\') {
        result += readEscape(path);
      } else {
        result += char;
        pos++;
      }
    }
  }

  function readEscape(path: string): string {
    const escapeStart = pos;
    pos++;
    if (pos >= text.length) fail('unterminated-string', path);
    const char = text.charAt(pos);
    const simple = SIMPLE_ESCAPES[char];
    if (simple !== undefined) {
      pos++;
      return simple;
    }
    const hex = text.slice(pos + 1, pos + 5).toLowerCase();
    if (char !== 'u' || !UNICODE_ESCAPE_HEX.test(hex)) fail('invalid-escape', path, escapeStart);
    let code = 0;
    for (const digit of hex) code = code * 16 + HEX_DIGITS.indexOf(digit);
    pos += 5;
    return String.fromCharCode(code);
  }

  function readArray(depth: number, path: string): ExactJsonValue[] {
    if (depth > MAX_DEPTH) fail('max-depth', path);
    pos++;
    const items: ExactJsonValue[] = [];
    skipWhitespace();
    if (text.charAt(pos) === ']') {
      pos++;
      return items;
    }
    for (;;) {
      items.push(readValue(depth, `${path}[${items.length}]`));
      skipWhitespace();
      if (text.charAt(pos) === ']') {
        pos++;
        return items;
      }
      expectChar(',', path);
    }
  }

  function readObject(depth: number, path: string): { [key: string]: ExactJsonValue } {
    if (depth > MAX_DEPTH) fail('max-depth', path);
    pos++;
    const result: { [key: string]: ExactJsonValue } = Object.create(null);
    skipWhitespace();
    if (text.charAt(pos) === '}') {
      pos++;
      return result;
    }
    for (;;) {
      skipWhitespace();
      const keyStart = pos;
      if (text.charAt(pos) !== '"') fail(pos >= text.length ? 'unexpected-end' : 'unexpected-character', path);
      const key = readString(path);
      const memberPath = path === '' ? key : `${path}.${key}`;
      if (Object.hasOwn(result, key)) fail('duplicate-key', memberPath, keyStart);
      skipWhitespace();
      expectChar(':', memberPath);
      result[key] = readValue(depth, memberPath);
      skipWhitespace();
      if (text.charAt(pos) === '}') {
        pos++;
        return result;
      }
      expectChar(',', path);
    }
  }

  const value = readValue(0, '');
  skipWhitespace();
  if (pos < text.length) fail('trailing-content', '');
  return value;
}
