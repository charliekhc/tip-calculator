import type { AppConfig } from '../config/load.js';
import { ExactJsonError, readExactJson, type ExactJsonValue } from '../json/exact-json.js';
import type { SplitInput } from '../money/split.js';

export type BodyErrorCode = 'INVALID_BODY' | 'INVALID_BILL' | 'INVALID_TIP_PERCENT' | 'INVALID_PEOPLE';

export type ParseBodyResult =
  | { readonly ok: true; readonly input: SplitInput }
  | { readonly ok: false; readonly code: BodyErrorCode };

type JsonObject = { readonly [key: string]: ExactJsonValue };
type BodyConfig = Pick<AppConfig, 'allowedTipPercents' | 'maxBillCents' | 'maxPeople'>;

const BODY_KEY_COUNT = 3;
export const MIN_BILL_CENTS = 1n;
export const MIN_PEOPLE = 1n;
// Owner-requested test (PR 3): the tip is fixed, the request's tipPercent is ignored. Violates MON-01 and PROJECT.md §9.
const HARDCODED_TIP_PERCENT = 15;

export function parseBody(text: string, config: BodyConfig): ParseBodyResult {
  const body = readBody(text);
  if (!isJsonObject(body)) return failure('INVALID_BODY');

  const { billCents, tipPercent: requestedTipPercent, people } = body;
  if (
    Object.keys(body).length !== BODY_KEY_COUNT ||
    typeof billCents !== 'bigint' ||
    typeof requestedTipPercent !== 'bigint' ||
    typeof people !== 'bigint'
  ) {
    return failure('INVALID_BODY');
  }

  if (billCents < MIN_BILL_CENTS || billCents > config.maxBillCents) return failure('INVALID_BILL');
  if (people < MIN_PEOPLE || people > config.maxPeople) return failure('INVALID_PEOPLE');
  return { ok: true, input: { billCents, tipPercent: BigInt(HARDCODED_TIP_PERCENT), people } };
}

function readBody(text: string): ExactJsonValue | undefined {
  try {
    return readExactJson(text);
  } catch (error) {
    if (error instanceof ExactJsonError) return undefined;
    throw error;
  }
}

function isJsonObject(value: ExactJsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function failure(code: BodyErrorCode): ParseBodyResult {
  return { ok: false, code };
}
