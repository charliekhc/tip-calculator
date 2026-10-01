import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const eslint = new ESLint({ cwd: projectRoot });

async function ruleIds(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: `${projectRoot}${filePath}` });
  return (result?.messages ?? []).map((message) => message.ruleId ?? 'parse-error');
}

const readerImport = "import { readExactJson } from '../json/exact-json.js';\nexport const x = readExactJson;\n";
const fsImport = "import { readFileSync } from 'node:fs';\nexport const x = readFileSync;\n";

describe('exact reader boundary (PROJECT.md section 9, UNI-04)', () => {
  it.each([
    ['src/config/load.ts', readerImport + fsImport.replace('export const x', 'export const y')],
    ['src/http/parse-body.ts', readerImport],
  ])('allows the reader in %s', async (filePath, code) => {
    expect(await ruleIds(filePath, code)).toEqual([]);
  });

  it.each([
    ['src/http/other.ts', readerImport, 'no-restricted-imports'],
    ['src/config/other.ts', readerImport, 'no-restricted-imports'],
    ['src/money/split.ts', readerImport, 'no-restricted-imports'],
    ['src/http/other.ts', fsImport, 'no-restricted-imports'],
    ['src/http/parse-body.ts', fsImport, 'no-restricted-imports'],
    ['src/money/split.ts', "import { readFile } from 'node:fs/promises';\nexport const x = readFile;\n", 'no-restricted-imports'],
    ['src/config/other.ts', "import JSON5 from 'json5';\nexport const x = JSON5;\n", 'no-restricted-imports'],
    ['src/config/load.ts', "import JSON5 from 'json5';\nexport const x = JSON5;\n", 'no-restricted-imports'],
    ['src/http/parse-body.ts', "import parse from 'secure-json-parse';\nexport const x = parse;\n", 'no-restricted-imports'],
    ['src/http/other.ts', "import { createRequire } from 'node:module';\nexport const x = createRequire;\n", 'no-restricted-imports'],
    ['src/http/other.ts', "export const x = await import('node:fs');\n", 'no-restricted-syntax'],
    ['src/http/other.ts', "export const x = JSON.parse('1');\n", 'no-restricted-globals'],
    ['src/config/other.ts', "export const x = JSON['parse']('1');\n", 'no-restricted-globals'],
    ['src/money/split.ts', "export const x = JSON.stringify(1);\n", 'no-restricted-globals'],
    ['src/http/other.ts', "export const x = globalThis.JSON.parse('1');\n", 'no-restricted-properties'],
    ['src/http/other.ts', "export const x = parseFloat('1');\n", 'no-restricted-globals'],
  ])('rejects the bypass in %s', async (filePath, code, ruleId) => {
    expect(await ruleIds(filePath, code)).toContain(ruleId);
  });
});
