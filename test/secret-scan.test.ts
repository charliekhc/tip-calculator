import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const script = join(projectRoot, 'scripts', 'secret-scan.sh');
const fixtureParents: string[] = [];

type ScanResult = { status: number; output: string };

function run(root: string): ScanResult {
  try {
    const output = execFileSync('sh', [script, root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { status: 0, output };
  } catch (error) {
    const failure = error as { status: number; stdout: string; stderr: string };
    return { status: failure.status, output: `${failure.stdout}${failure.stderr}` };
  }
}

function writeFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

function fixtureRoot(...below: string[]): string {
  const parent = mkdtempSync(join(projectRoot, '.tmp-scan-'));
  fixtureParents.push(parent);
  const root = join(parent, ...below);
  mkdirSync(root, { recursive: true });
  return root;
}

function scan(files: Record<string, string>, ...below: string[]): ScanResult {
  const root = fixtureRoot(...below);
  writeFiles(root, files);
  return run(root);
}

const awsKey = ['AK', 'IA', 'ABCDEFGHIJKLMNOP'].join('');
const passwordValue = 'correct-horse-battery';
const assignment = `${['pass', 'word'].join('').toUpperCase()} = "${passwordValue}"`;
const keyHeader = ['-----BEGIN ', 'RSA PRIV', 'ATE KEY', '-----'].join('');
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
    ['agents/notes.md', `key: ${awsKey}\n`, awsKey],
    ['agents/notes.md', `${assignment}\n`, passwordValue],
    ['agents/notes.md', `${keyHeader}\n`, keyHeader],
    ['package-lock.json', `{ "resolved": "https://x/${awsKey}" }\n`, awsKey],
    ['package-lock.json', `{ "x": "${keyHeader}" }\n`, keyHeader],
    ['src/a.ts', `const k = '${awsKey}';\n`, awsKey],
    ['docs/runbook.md', `${assignment}\n`, passwordValue],
    ['.github/workflows/ci.yml', `env:\n  x: ${awsKey}\n`, awsKey],
  ])('fails when %s holds a secret-looking value, and never prints the value', (path, content, value) => {
    const result = scan({ [path]: content });
    expect(result.status).toBe(1);
    expect(result.output).toContain(`./${path}:`);
    expect(result.output).not.toContain(value);
    expect(result.output).not.toContain(awsKey);
    expect(result.output).not.toContain(passwordValue);
  });

  it('reports the line number of the finding', () => {
    const result = scan({ 'src/a.ts': `const a = 1;\nconst b = 2;\nconst k = '${awsKey}';\n` });
    expect(result.status).toBe(1);
    expect(result.output).toContain('./src/a.ts:3 (layer 1: secret-looking value)');
  });

  it('fails when the scanned root sits beneath a folder named .agent, node_modules or dist', () => {
    for (const ancestor of ['.agent', 'node_modules', 'dist']) {
      const result = scan({ 'agents/notes.md': `key: ${awsKey}\n`, 'src/a.ts': `const k = '${awsKey}';\n` }, ancestor, 'review-checkout');
      expect(result.status, ancestor).toBe(1);
      expect(result.output, ancestor).toContain('./src/a.ts:1');
      expect(result.output, ancestor).toContain('./agents/notes.md:1');
    }
  });

  it('fails when a file name contains a space', () => {
    const result = scan({ 'src/my file.ts': `const k = '${awsKey}';\n` });
    expect(result.status).toBe(1);
    expect(result.output).toContain('./src/my file.ts:1');
  });

  it('fails on a base keyword outside the kit docs and the lockfile, and never prints the line', () => {
    const result = scan({ 'src/a.ts': `// ${words} handling goes here\n` });
    expect(result.status).toBe(1);
    expect(result.output).toContain('./src/a.ts:1 (layer 2: secret keyword)');
    expect(result.output).not.toContain('handling goes here');
  });

  it('does not report a clean result when a file cannot be read', () => {
    const root = fixtureRoot();
    writeFiles(root, { 'src/a.ts': `const k = '${awsKey}';\n` });
    chmodSync(join(root, 'src/a.ts'), 0o000);
    const result = run(root);
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain('secret-scan: clean');
  });

  it('fails when the root does not exist', () => {
    const result = run(join(projectRoot, '.tmp-scan-does-not-exist'));
    expect(result.status).not.toBe(0);
    expect(result.output).not.toContain('secret-scan: clean');
  });
});
