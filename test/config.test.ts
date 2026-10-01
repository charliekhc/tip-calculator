import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig, parseConfig } from '../src/config/load.js';

const VALID: Readonly<Record<string, string>> = {
  allowedTipPercents: '[0, 10, 15, 20]',
  currency: '"USD"',
  maxBillCents: '100000000',
  maxPeople: '100',
  maxBodyBytes: '1024',
  host: '"127.0.0.1"',
  port: '3000',
};

function configText(changes: Readonly<Record<string, string | null>> = {}): string {
  const members = Object.entries({ ...VALID, ...changes })
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([key, raw]) => `"${key}": ${raw}`);
  return `{ ${members.join(', ')} }`;
}

function configError(text: string, env: Record<string, string | undefined> = {}): string {
  try {
    parseConfig(text, env);
  } catch (error) {
    if (error instanceof ConfigError) return error.message;
    throw error;
  }
  throw new Error('expected the config to be rejected');
}

describe('loadConfig', () => {
  it('loads the real config/app.json', () => {
    const config = loadConfig({
      filePath: fileURLToPath(new URL('../config/app.json', import.meta.url)),
      env: {},
    });
    expect(config).toEqual({
      allowedTipPercents: [0n, 10n, 15n, 20n],
      suggestedTipPercent: 15n,
      currency: 'USD',
      maxBillCents: 100000000n,
      maxPeople: 100n,
      maxBodyBytes: 1024,
      host: '127.0.0.1',
      port: 3000,
    });
  });

  it('fails with a clear message when the file is missing', () => {
    const filePath = fileURLToPath(new URL('./no-such-config.json', import.meta.url));
    expect(() => loadConfig({ filePath, env: {} })).toThrow(ConfigError);
    expect(() => loadConfig({ filePath, env: {} })).toThrow(`config file ${filePath} could not be read`);
  });
});

describe('parseConfig types', () => {
  it('keeps every money-related value as a bigint', () => {
    const config = parseConfig(configText(), {});
    expect(typeof config.maxBillCents).toBe('bigint');
    expect(typeof config.maxPeople).toBe('bigint');
    expect(config.allowedTipPercents.length).toBe(4);
    for (const tip of config.allowedTipPercents) expect(typeof tip).toBe('bigint');
  });

  it('converts only port and maxBodyBytes to number', () => {
    const config = parseConfig(configText(), {});
    expect(typeof config.port).toBe('number');
    expect(typeof config.maxBodyBytes).toBe('number');
  });

  it('suggests 15 when it is allowed and the first allowed tip otherwise', () => {
    expect(parseConfig(configText(), {}).suggestedTipPercent).toBe(15n);
    expect(parseConfig(configText({ allowedTipPercents: '[5, 10]' }), {}).suggestedTipPercent).toBe(5n);
  });

  it('reads the tip list from config with no fixed values in code', () => {
    expect(parseConfig(configText({ allowedTipPercents: '[0, 5]' }), {}).allowedTipPercents).toEqual([0n, 5n]);
  });
});

describe('parseConfig file shape', () => {
  it.each([
    ['not JSON', 'not valid exact JSON'],
    ['[]', 'config must be a JSON object'],
    ['null', 'config must be a JSON object'],
    [`${configText()} x`, 'not valid exact JSON: trailing-content'],
    [configText({ maxPeople: '100, "maxPeople": 100' }), 'duplicate-key'],
  ])('rejects %j', (text, message) => {
    expect(configError(text)).toContain(message);
  });

  it.each(Object.keys(VALID))('rejects a config with %s missing', (key) => {
    expect(configError(configText({ [key]: null }))).toBe(`config key ${key} is missing (every key is required)`);
  });

  it.each(['extra', 'HOST', 'billCents', '__proto__'])('rejects unknown key %s', (key) => {
    expect(configError(configText({ [key]: '1' }))).toBe(`config key ${key} is not allowed (unknown key)`);
  });
});

describe('parseConfig allowedTipPercents', () => {
  const listRule = 'allowedTipPercents must be a list of 1 to 101 unique integers';
  const entryRule = 'must be an integer from 0 to 100';

  it.each([
    ['[]', `${listRule} (got 0 entries)`],
    ['"0,10"', listRule],
    ['{}', listRule],
    ['[5.5]', 'not-integer'],
    ['[10, 5.5]', 'not-integer'],
    ['[-1]', `allowedTipPercents[0] ${entryRule} (got -1)`],
    ['[0, 101]', `allowedTipPercents[1] ${entryRule} (got 101)`],
    ['["15"]', `allowedTipPercents[0] ${entryRule}`],
    ['[true]', `allowedTipPercents[0] ${entryRule}`],
    ['[null]', `allowedTipPercents[0] ${entryRule}`],
    ['[10, 15, 10]', `${listRule} (10 appears twice)`],
    ['[0, 0]', `${listRule} (0 appears twice)`],
  ])('rejects %s', (raw, message) => {
    expect(configError(configText({ allowedTipPercents: raw }))).toContain(message);
  });

  it('accepts 0 and 100 at the edges', () => {
    expect(parseConfig(configText({ allowedTipPercents: '[0, 100]' }), {}).allowedTipPercents).toEqual([0n, 100n]);
  });

  it('accepts 101 unique entries and rejects 102 entries', () => {
    const all = Array.from({ length: 101 }, (_, i) => `${i}`);
    expect(parseConfig(configText({ allowedTipPercents: `[${all.join(', ')}]` }), {}).allowedTipPercents).toHaveLength(101);
    expect(configError(configText({ allowedTipPercents: `[${[...all, '0'].join(', ')}]` }))).toBe(
      `${listRule} (got 102 entries)`,
    );
  });
});

describe('parseConfig currency', () => {
  const rule = 'currency must be exactly "USD" and a key of the currency exponent table';

  it.each(['"EUR"', '"JPY"', '"usd"', '""', '" USD"', '2', 'null', '["USD"]'])('rejects %s', (raw) => {
    expect(configError(configText({ currency: raw }))).toBe(rule);
  });

  it('rejects a missing currency', () => {
    expect(configError(configText({ currency: null }))).toBe('config key currency is missing (every key is required)');
  });
});

describe('parseConfig integer limits', () => {
  it.each([
    ['maxPeople', '1', 1n],
    ['maxPeople', '1000', 1000n],
    ['maxBillCents', '1', 1n],
    ['maxBillCents', '1000000000000', 1000000000000n],
    ['maxBodyBytes', '64', 64],
    ['maxBodyBytes', '4096', 4096],
    ['port', '1', 1],
    ['port', '65535', 65535],
  ] as const)('accepts %s %s', (key, raw, expected) => {
    expect(parseConfig(configText({ [key]: raw }), {})[key]).toBe(expected);
  });

  it.each([
    ['maxPeople', '0', 'maxPeople must be an integer from 1 to 1000 (got 0)'],
    ['maxPeople', '1001', 'maxPeople must be an integer from 1 to 1000 (got 1001)'],
    ['maxBodyBytes', '63', 'maxBodyBytes must be an integer from 64 to 4096 (got 63)'],
    ['maxBodyBytes', '4097', 'maxBodyBytes must be an integer from 64 to 4096 (got 4097)'],
    ['maxBillCents', '0', 'maxBillCents must be an integer from 1 to 1000000000000 (got 0)'],
    ['maxBillCents', '-1', 'maxBillCents must be an integer from 1 to 1000000000000 (got -1)'],
    ['maxBillCents', '1000000000001', 'maxBillCents must be an integer from 1 to 1000000000000 (got 1000000000001)'],
    [
      'maxBillCents',
      '9007199254740993',
      'maxBillCents must be an integer from 1 to 1000000000000 (got 9007199254740993)',
    ],
    ['port', '0', 'port must be an integer from 1 to 65535 (got 0)'],
    ['port', '65536', 'port must be an integer from 1 to 65535 (got 65536)'],
  ])('rejects %s %s', (key, raw, message) => {
    expect(configError(configText({ [key]: raw }))).toBe(message);
  });

  it.each([
    ['maxBillCents', '"100000000"', 'maxBillCents must be an integer from 1 to 1000000000000'],
    ['maxPeople', 'true', 'maxPeople must be an integer from 1 to 1000'],
    ['maxBodyBytes', 'null', 'maxBodyBytes must be an integer from 64 to 4096'],
    ['port', '"3000"', 'port must be an integer from 1 to 65535'],
    ['maxPeople', '[100]', 'maxPeople must be an integer from 1 to 1000'],
  ])('rejects %s of the wrong type (%s)', (key, raw, message) => {
    expect(configError(configText({ [key]: raw }))).toBe(message);
  });

  it.each([
    ['maxBillCents', '1000000000000.0'],
    ['maxBillCents', '1e12'],
    ['maxPeople', '100.0'],
    ['maxBodyBytes', '1024.5'],
    ['port', '3e3'],
  ])('rejects %s written as %s and names the key', (key, raw) => {
    expect(configError(configText({ [key]: raw }))).toMatch(new RegExp(`not-integer at position \\d+ \\(at ${key}\\)$`));
  });

  it('rejects a 19-digit integer', () => {
    expect(configError(configText({ maxBillCents: '1000000000000000000' }))).toContain(
      'too-many-digits at position',
    );
  });
});

describe('parseConfig host', () => {
  const rule = 'must be a valid IPv4 or IPv6 literal, or "localhost"';

  it.each(['"127.0.0.1"', '"0.0.0.0"', '"::1"', '"localhost"'])('accepts file host %s', (raw) => {
    expect(parseConfig(configText({ host: raw }), {}).host).toBe(raw.slice(1, -1));
  });

  it.each(['""', '"a b"', '"example.com"', '"LOCALHOST"', '"256.0.0.1"', '"127.0.0.1 "', '1'])(
    'rejects file host %s',
    (raw) => {
      expect(configError(configText({ host: raw }))).toBe(`host ${rule}`);
    },
  );
});

describe('parseConfig HOST and PORT overrides', () => {
  it('uses the file values when HOST and PORT are unset', () => {
    const config = parseConfig(configText(), { HOST: undefined, PORT: undefined });
    expect(config.host).toBe('127.0.0.1');
    expect(config.port).toBe(3000);
  });

  it('applies valid overrides', () => {
    const config = parseConfig(configText(), { HOST: '::1', PORT: '8080' });
    expect(config.host).toBe('::1');
    expect(config.port).toBe(8080);
  });

  it.each(['localhost', '0.0.0.0', '192.168.1.10'])('accepts HOST %j', (host) => {
    expect(parseConfig(configText(), { HOST: host }).host).toBe(host);
  });

  it.each([
    ['1', 1],
    ['65535', 65535],
    ['00080', 80],
  ] as const)('accepts PORT %j', (port, expected) => {
    expect(parseConfig(configText(), { PORT: port }).port).toBe(expected);
  });

  it('ignores other environment variables', () => {
    expect(parseConfig(configText(), { MAX_PEOPLE: '5000', maxPeople: '5000' }).maxPeople).toBe(100n);
  });

  it.each(['', 'a b', 'example.com', ' 127.0.0.1'])('rejects HOST %j', (host) => {
    expect(configError(configText(), { HOST: host })).toBe(
      'HOST must be a valid IPv4 or IPv6 literal, or "localhost"',
    );
  });

  it.each([
    ['0', 'PORT must be an integer from 1 to 65535 (got 0)'],
    ['65536', 'PORT must be an integer from 1 to 65535 (got 65536)'],
    ['9007199254740993', 'PORT must be an integer from 1 to 65535 (got 9007199254740993)'],
    ['abc', 'PORT must match ^[0-9]+$'],
    ['80.5', 'PORT must match ^[0-9]+$'],
    ['', 'PORT must match ^[0-9]+$'],
    ['-80', 'PORT must match ^[0-9]+$'],
    [' 80', 'PORT must match ^[0-9]+$'],
    ['8e1', 'PORT must match ^[0-9]+$'],
    ['0x50', 'PORT must match ^[0-9]+$'],
  ])('rejects PORT %j', (port, message) => {
    expect(configError(configText(), { PORT: port })).toBe(message);
  });

  it('still validates the file host and port when overrides are set', () => {
    expect(configError(configText({ host: '"a b"' }), { HOST: '::1' })).toBe(
      'host must be a valid IPv4 or IPv6 literal, or "localhost"',
    );
    expect(configError(configText({ port: '0' }), { PORT: '8080' })).toBe(
      'port must be an integer from 1 to 65535 (got 0)',
    );
  });
});

describe('source scan', () => {
  const srcRoot = fileURLToPath(new URL('../src/', import.meta.url));
  const strictDirs = ['money', 'http', 'json', 'config'];
  const conversionFunction = /^function toFrameworkNumber\(value: bigint\): number \{\n {2}return Number\(value\);\n\}$/gm;

  const sources = readdirSync(srcRoot, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => ({
      path: file.split(sep).join('/'),
      text: readFileSync(join(srcRoot, file), 'utf8'),
    }));

  it('finds the source files it guards', () => {
    const paths = sources.map((source) => source.path);
    expect(paths).toContain('json/exact-json.ts');
    expect(paths).toContain('config/load.ts');
    expect(paths).toContain('money/currency.ts');
  });

  it('never uses JSON.parse anywhere in src/', () => {
    for (const source of sources) expect(source.text, source.path).not.toContain('JSON.parse');
  });

  it('defines the one number conversion only in config/load.ts and calls it only for port and maxBodyBytes', () => {
    for (const source of sources) {
      const definitions = source.text.match(conversionFunction) ?? [];
      const uses = source.text.match(/toFrameworkNumber\(/g) ?? [];
      if (source.path === 'config/load.ts') {
        expect(definitions).toHaveLength(1);
        expect(source.text).toContain('maxBodyBytes: toFrameworkNumber(maxBodyBytes),');
        expect(source.text).toContain('port: toFrameworkNumber(port),');
        expect(uses).toHaveLength(3);
      } else {
        expect(uses, source.path).toHaveLength(0);
      }
    }
  });

  it('uses no Number(, parseFloat, parseInt or Math. in money, http, json and config code', () => {
    const guarded = sources.filter((source) => strictDirs.includes(source.path.split('/')[0] ?? ''));
    for (const source of guarded) {
      const text = source.path === 'config/load.ts' ? source.text.replace(conversionFunction, '') : source.text;
      for (const banned of [/(?<![\w$])Number\s*\(/, /parseFloat/, /parseInt/, /(?<![\w$])Math\s*\./]) {
        expect(text, `${source.path} matches ${banned}`).not.toMatch(banned);
      }
    }
  });
});
