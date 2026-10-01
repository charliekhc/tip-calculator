import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const fsModules = ['fs', 'node:fs', 'fs/promises', 'node:fs/promises'];
const dynamicLoading = ['module', 'node:module'];
const otherJsonReaders = ['json5', 'secure-json-parse', 'bourne', 'yaml', 'js-yaml', 'toml', 'jsonc-parser'];

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'agents/', 'docs/', '.tmp-scan-*/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'JSON', message: 'Read JSON only through src/json/exact-json.ts and write it through src/http/encode.ts (spec D5).' },
        { name: 'parseFloat', message: 'No floats for money (MON-01).' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'globalThis', property: 'JSON', message: 'Use src/json/exact-json.ts (spec D5).' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: 'ImportExpression', message: 'No dynamic import in src/ (spec D5).' },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...fsModules.map((name) => ({ name, message: 'Only src/config/load.ts reads files (spec D5: one exact reader).' })),
            ...dynamicLoading.map((name) => ({ name, message: 'No module loading tricks in src/ (spec D5).' })),
            ...otherJsonReaders.map((name) => ({ name, message: 'Use src/json/exact-json.ts (spec D5).' })),
          ],
          patterns: [
            { group: ['**/json/exact-json.js', '**/json/exact-json'], message: 'Only src/config/load.ts and src/http/parse-body.ts may import the exact reader.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/config/load.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...dynamicLoading.map((name) => ({ name, message: 'No module loading tricks in src/ (spec D5).' })),
            ...otherJsonReaders.map((name) => ({ name, message: 'Use src/json/exact-json.ts (spec D5).' })),
          ],
        },
      ],
    },
  },
  {
    files: ['src/http/parse-body.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...fsModules.map((name) => ({ name, message: 'Only src/config/load.ts reads files (spec D5: one exact reader).' })),
            ...dynamicLoading.map((name) => ({ name, message: 'No module loading tricks in src/ (spec D5).' })),
            ...otherJsonReaders.map((name) => ({ name, message: 'Use src/json/exact-json.ts (spec D5).' })),
          ],
        },
      ],
    },
  },
);
