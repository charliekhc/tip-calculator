import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const script = join(projectRoot, 'scripts', 'secret-scan.sh');
const fixtureParents: string[] = [];

function scan(files: Record<string, string>): { status: number; output: string } {
  const root = mkdtempSync(join(projectRoot, '.tmp-scan-'));
  fixtureParents.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  try {
    const output = execFileSync('sh', [script, root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string };
    return { status: failure.status, output: `${failure.stdout}${failure.stderr}` };
  }
}

const awsKey = ['AK', 'IA', 'ABCDEFGHIJKLMNOP'].join('');
const assignment = ['pass', 'word'].join('').toUpperCase() + ' = "' + 'correct-horse-battery' + '"';
const privateKey = ['-----BEGIN ', 'RSA PRIV', 'ATE KEY', '-----'].join('');
const words = ['TO', 'KEN', ' PASS', 'WORD', ' BEGIN OPEN', 'SSH'].join('');

afterEach(() => {
  for (const dir of fixtureParents.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('secret scan script', () => {
  it('passes a clean tree and kit-style documentation that only mentions the words', () => {
    const result = scan({
      'src/a.ts': 'export const a = 1;\n',
      'agents/README.md': `Never commit these: ${words}\n`,
      'package-lock.json': '{ "name": "x", "packages": {} }\n',
    });
    expect(result.status).toBe(0);
    expect(result.output).toContain('secret-scan: clean');
  });

  it.each([
    ['agents/notes.md', `key: ${awsKey}\n`],
    ['agents/notes.md', `${assignment}\n`],
    ['agents/notes.md', `${privateKey}\n`],
    ['package-lock.json', `{ "resolved": "https://x/${awsKey}" }\n`],
    ['package-lock.json', `{ "x": "${privateKey}" }\n`],
    ['src/a.ts', `const k = '${awsKey}';\n`],
    ['docs/runbook.md', `${assignment}\n`],
    ['.github/workflows/ci.yml', `env:\n  x: ${awsKey}\n`],
  ])('fails when %s holds a secret-looking value', (path, content) => {
    const result = scan({ [path]: content });
    expect(result.status).toBe(1);
    expect(result.output).toContain(path);
  });

  it('fails when a file name contains a space', () => {
    const result = scan({ 'src/my file.ts': `const k = '${awsKey}';\n` });
    expect(result.status).toBe(1);
  });

  it('fails on a base keyword outside the kit docs and the lockfile', () => {
    const result = scan({ 'src/a.ts': `// ${words} handling goes here\n` });
    expect(result.status).toBe(1);
    expect(result.output).toContain('layer 2');
  });
});
