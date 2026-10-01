import type { AppConfig } from '../config/load.js';
import type { SplitInput, SplitResult } from '../money/split.js';
import { MIN_BILL_CENTS, MIN_PEOPLE, type BodyErrorCode } from './parse-body.js';

export type ErrorCode = BodyErrorCode | 'UNSUPPORTED_MEDIA_TYPE' | 'INTERNAL';

type MessageConfig = Pick<AppConfig, 'allowedTipPercents' | 'maxBillCents' | 'maxPeople'>;

const SHORT_ESCAPES: Readonly<Record<string, string>> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};
const FIRST_PRINTABLE = 0x20;
const HEX = 16;
const UNICODE_ESCAPE_WIDTH = 4;

// Layout matches the spec section 4 examples byte for byte.
export function encodeSplit(currency: string, input: SplitInput, result: SplitResult): string {
  return [
    '{',
    `  "currency": ${jsonString(currency)},`,
    `  "billCents": ${jsonInteger(input.billCents)},`,
    `  "tipPercent": ${jsonInteger(input.tipPercent)},`,
    `  "tipCents": ${jsonInteger(result.tipCents)},`,
    `  "totalCents": ${jsonInteger(result.totalCents)},`,
    `  "people": ${jsonInteger(input.people)},`,
    `  "sharesCents": [${result.sharesCents.map(jsonInteger).join(', ')}]`,
    '}',
  ].join('\n');
}

export function encodeError(code: ErrorCode, config: MessageConfig): string {
  return `{ "error": { "code": ${jsonString(code)}, "message": ${jsonString(errorMessage(code, config))} } }`;
}

function errorMessage(code: ErrorCode, config: MessageConfig): string {
  switch (code) {
    case 'INVALID_BODY':
      return 'body must be a JSON object with exactly the integer fields billCents, tipPercent and people';
    case 'INVALID_BILL':
      return `billCents must be an integer from ${jsonInteger(MIN_BILL_CENTS)} to ${jsonInteger(config.maxBillCents)}`;
    case 'INVALID_TIP_PERCENT':
      return `tipPercent must be one of ${config.allowedTipPercents.map(jsonInteger).join(', ')}`;
    case 'INVALID_PEOPLE':
      return `people must be an integer from ${jsonInteger(MIN_PEOPLE)} to ${jsonInteger(config.maxPeople)}`;
    case 'UNSUPPORTED_MEDIA_TYPE':
      return 'Content-Type must be application/json';
    case 'INTERNAL':
      return 'internal error';
  }
}

function jsonInteger(value: bigint): string {
  return value.toString();
}

function jsonString(text: string): string {
  let out = '"';
  for (const char of text) {
    const short = SHORT_ESCAPES[char];
    const code = char.charCodeAt(0);
    if (short !== undefined) out += short;
    else if (code < FIRST_PRINTABLE) out += `\\u${code.toString(HEX).padStart(UNICODE_ESCAPE_WIDTH, '0')}`;
    else out += char;
  }
  return `${out}"`;
}
