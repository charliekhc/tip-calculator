import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { ExactJsonError, readExactJson, type ExactJsonValue } from '../json/exact-json.js';
import { isCurrencyCode } from '../money/currency.js';

export interface AppConfig {
  readonly allowedTipPercents: readonly bigint[];
  readonly currency: 'USD';
  readonly maxBillCents: bigint;
  readonly maxPeople: bigint;
  readonly maxBodyBytes: number;
  readonly host: string;
  readonly port: number;
}

export class ConfigError extends Error {
  override readonly name = 'ConfigError';
}

type Env = Readonly<Record<string, string | undefined>>;
type JsonObject = { readonly [key: string]: ExactJsonValue };

const CONFIG_KEYS = [
  'allowedTipPercents',
  'currency',
  'maxBillCents',
  'maxPeople',
  'maxBodyBytes',
  'host',
  'port',
] as const;

const TIP_LIST_MAX_LENGTH = 101;
const TIP_PERCENT_MIN = 0n;
const TIP_PERCENT_MAX = 100n;
const MAX_BILL_CENTS_CEILING = 1_000_000_000_000n;
const MAX_PEOPLE_CEILING = 1000n;
const MAX_BODY_BYTES_FLOOR = 64n;
const MAX_BODY_BYTES_CEILING = 4096n;
const PORT_MIN = 1n;
const PORT_MAX = 65535n;
const PORT_TEXT = /^[0-9]+$/;

export function loadConfig(opts: { filePath: string; env: Env }): AppConfig {
  let text: string;
  try {
    text = readFileSync(opts.filePath, 'utf8');
  } catch (error) {
    throw new ConfigError(`config file ${opts.filePath} could not be read`, { cause: error });
  }
  return parseConfig(text, opts.env);
}

export function parseConfig(text: string, env: Env): AppConfig {
  const file = readConfigObject(text);

  const allowedTipPercents = tipList(file.allowedTipPercents);
  const currency = currencyCode(file.currency);
  const maxBillCents = integerInRange('maxBillCents', file.maxBillCents, 1n, MAX_BILL_CENTS_CEILING);
  const maxPeople = integerInRange('maxPeople', file.maxPeople, 1n, MAX_PEOPLE_CEILING);
  const maxBodyBytes = integerInRange('maxBodyBytes', file.maxBodyBytes, MAX_BODY_BYTES_FLOOR, MAX_BODY_BYTES_CEILING);
  const fileHost = hostName('host', file.host);
  const filePort = integerInRange('port', file.port, PORT_MIN, PORT_MAX);

  const host = env.HOST === undefined ? fileHost : hostName('HOST', env.HOST);
  const port = env.PORT === undefined ? filePort : portFromEnv(env.PORT);

  return {
    allowedTipPercents,
    currency,
    maxBillCents,
    maxPeople,
    maxBodyBytes: toFrameworkNumber(maxBodyBytes),
    host,
    port: toFrameworkNumber(port),
  };
}

function readConfigObject(text: string): JsonObject {
  let value: ExactJsonValue;
  try {
    value = readExactJson(text);
  } catch (error) {
    if (error instanceof ExactJsonError) {
      throw new ConfigError(`config is not valid exact JSON: ${error.message}`, { cause: error });
    }
    throw error;
  }
  if (!isJsonObject(value)) throw new ConfigError('config must be a JSON object');
  for (const key of Object.keys(value)) {
    if (!isConfigKey(key)) throw new ConfigError(`config key ${key} is not allowed (unknown key)`);
  }
  const missing = CONFIG_KEYS.find((key) => !Object.hasOwn(value, key));
  if (missing !== undefined) throw new ConfigError(`config key ${missing} is missing (every key is required)`);
  return value;
}

function isJsonObject(value: ExactJsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConfigKey(key: string): key is (typeof CONFIG_KEYS)[number] {
  return CONFIG_KEYS.some((configKey) => configKey === key);
}

function integerInRange(key: string, value: ExactJsonValue | undefined, min: bigint, max: bigint): bigint {
  const rule = `must be an integer from ${min} to ${max}`;
  if (typeof value !== 'bigint') throw new ConfigError(`${key} ${rule}`);
  if (value < min || value > max) throw new ConfigError(`${key} ${rule} (got ${value})`);
  return value;
}

function tipList(value: ExactJsonValue | undefined): bigint[] {
  const rule = `must be a list of 1 to ${TIP_LIST_MAX_LENGTH} unique integers`;
  if (!Array.isArray(value)) throw new ConfigError(`allowedTipPercents ${rule}`);
  const tips: readonly ExactJsonValue[] = value;
  if (tips.length === 0 || tips.length > TIP_LIST_MAX_LENGTH) {
    throw new ConfigError(`allowedTipPercents ${rule} (got ${tips.length} entries)`);
  }
  const seen = new Set<bigint>();
  tips.forEach((entry, index) => {
    const tip = integerInRange(`allowedTipPercents[${index}]`, entry, TIP_PERCENT_MIN, TIP_PERCENT_MAX);
    if (seen.has(tip)) throw new ConfigError(`allowedTipPercents ${rule} (${tip} appears twice)`);
    seen.add(tip);
  });
  return [...seen];
}

function currencyCode(value: ExactJsonValue | undefined): 'USD' {
  if (value !== 'USD' || !isCurrencyCode(value)) {
    throw new ConfigError('currency must be exactly "USD" and a key of the currency exponent table');
  }
  return value;
}

function hostName(key: string, value: ExactJsonValue | undefined): string {
  if (typeof value !== 'string' || (value !== 'localhost' && isIP(value) === 0)) {
    throw new ConfigError(`${key} must be a valid IPv4 or IPv6 literal, or "localhost"`);
  }
  return value;
}

function portFromEnv(text: string): bigint {
  if (!PORT_TEXT.test(text)) throw new ConfigError(`PORT must match ${PORT_TEXT.source}`);
  return integerInRange('PORT', BigInt(text), PORT_MIN, PORT_MAX);
}

function toFrameworkNumber(value: bigint): number {
  return Number(value);
}
